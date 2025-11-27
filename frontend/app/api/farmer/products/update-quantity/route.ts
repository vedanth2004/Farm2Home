import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PUT - Update quantity for an existing product
 * Creates a new draft or updates existing draft/listing with additional quantity
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { productId, additionalQty, farmerPrice } = body;

    if (!productId || !additionalQty || additionalQty <= 0) {
      return NextResponse.json(
        { error: "Product ID and valid quantity are required" },
        { status: 400 },
      );
    }

    // Get farmer profile
    const farmerProfile = await prisma.farmerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!farmerProfile) {
      return NextResponse.json(
        { error: "Farmer profile not found" },
        { status: 404 },
      );
    }

    // Verify the product belongs to this farmer
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.farmerId !== farmerProfile.id) {
      return NextResponse.json(
        { error: "You can only update your own products" },
        { status: 403 },
      );
    }

    // Check if there's an active listing
    const activeListing = await prisma.productListing.findFirst({
      where: {
        productId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (activeListing) {
      // Update existing active listing quantity
      await prisma.productListing.update({
        where: { id: activeListing.id },
        data: {
          availableQty: {
            increment: additionalQty,
          },
          // Update price if provided
          ...(farmerPrice && {
            farmerPrice: farmerPrice,
            storePrice: farmerPrice * 1.15, // 15% margin
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Quantity successfully updated for ${product.name}`,
        product: {
          id: product.id,
          name: product.name,
          newStock: activeListing.availableQty + additionalQty,
        },
      });
    }

    // Check if there's a pending draft
    const pendingDraft = await prisma.productDraft.findFirst({
      where: {
        productId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    if (pendingDraft) {
      // Update pending draft quantity
      await prisma.productDraft.update({
        where: { id: pendingDraft.id },
        data: {
          availableQty: pendingDraft.availableQty + additionalQty,
          // Update price if provided
          ...(farmerPrice && {
            farmerPrice: farmerPrice,
            pricePerUnit: farmerPrice,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Quantity successfully updated for ${product.name} (pending approval)`,
        product: {
          id: product.id,
          name: product.name,
          newStock: pendingDraft.availableQty + additionalQty,
        },
      });
    }

    // Create a new draft for approval with the additional quantity
    const price = farmerPrice || 0;
    await prisma.productDraft.create({
      data: {
        productId,
        pricePerUnit: price,
        farmerPrice: price,
        availableQty: additionalQty,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: `New listing created for ${product.name}. Pending admin approval.`,
      product: {
        id: product.id,
        name: product.name,
        newStock: additionalQty,
      },
    });
  } catch (error) {
    console.error("Error updating product quantity:", error);
    return NextResponse.json(
      { error: "Failed to update product quantity" },
      { status: 500 },
    );
  }
}
