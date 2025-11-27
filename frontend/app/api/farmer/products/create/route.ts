import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST - Create a new product (with duplicate validation)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create farmer profile
    let farmerProfile = await prisma.farmerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!farmerProfile) {
      farmerProfile = await prisma.farmerProfile.create({
        data: {
          userId: session.user.id,
          verified: true,
          upiId: null,
        },
      });
    }

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    const baseUnit = formData.get("baseUnit") as string;
    const farmerPrice = parseFloat(formData.get("farmerPrice") as string);
    const availableQty = parseInt(formData.get("availableQty") as string);

    if (
      !name ||
      !category ||
      !description ||
      !baseUnit ||
      !farmerPrice ||
      !availableQty
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Check for duplicate product (same name and category for this farmer)
    const existingProduct = await prisma.product.findFirst({
      where: {
        farmerId: farmerProfile.id,
        name: {
          equals: name,
          mode: "insensitive",
        },
        category: category,
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        {
          error:
            "This product already exists in your catalog. Please use 'Select from My Products' to update the quantity instead.",
        },
        { status: 400 },
      );
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        category,
        description,
        baseUnit,
        photos: [], // TODO: Implement file upload
        farmerId: farmerProfile.id,
      },
    });

    // Create product draft for approval
    await prisma.productDraft.create({
      data: {
        productId: product.id,
        pricePerUnit: farmerPrice,
        farmerPrice: farmerPrice,
        availableQty,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Product created successfully! Pending admin approval.",
      product: {
        id: product.id,
        name: product.name,
      },
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}
