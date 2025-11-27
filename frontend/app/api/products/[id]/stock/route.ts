import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const productId = params.id;

    // Get active listing for the product
    const activeListing = await prisma.productListing.findFirst({
      where: {
        productId,
        isActive: true,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            baseUnit: true,
          },
        },
      },
    });

    if (!activeListing) {
      return NextResponse.json(
        { error: "Product not available" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      productId: activeListing.product.id,
      productName: activeListing.product.name,
      availableStock: activeListing.availableQty,
      unit: activeListing.product.baseUnit,
      price: Number(activeListing.pricePerUnit),
    });
  } catch (error) {
    console.error("Error fetching product stock:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
