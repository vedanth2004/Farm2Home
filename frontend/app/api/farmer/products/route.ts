import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET - Fetch all existing products for the logged-in farmer
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Fetch all products for this farmer
    const products = await prisma.product.findMany({
      where: {
        farmerId: farmerProfile.id,
      },
      include: {
        listings: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        drafts: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format products with current stock and price info
    const formattedProducts = products.map((product) => {
      const activeListing = product.listings[0];
      const pendingDraft = product.drafts[0];

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        description: product.description,
        baseUnit: product.baseUnit,
        photos: product.photos,
        currentStock: activeListing?.availableQty || 0,
        currentPrice: activeListing
          ? Number(activeListing.farmerPrice || activeListing.pricePerUnit || 0)
          : pendingDraft
            ? Number(pendingDraft.farmerPrice || pendingDraft.pricePerUnit || 0)
            : 0,
        hasActiveListing: !!activeListing,
        hasPendingDraft: !!pendingDraft,
        createdAt: product.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      products: formattedProducts,
    });
  } catch (error) {
    console.error("Error fetching farmer products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}
