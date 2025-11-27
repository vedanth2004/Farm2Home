import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access this
    if (!can(session.user.role, "read:analytics")) {
      return NextResponse.json(
        { error: "Forbidden", message: "Admin access required" },
        { status: 403 },
      );
    }

    // Get unique categories from products
    const categories = await prisma.product.findMany({
      select: {
        category: true,
      },
      distinct: ["category"],
      orderBy: {
        category: "asc",
      },
    });

    // Get products with their details for selection
    const products = await prisma.product.findMany({
      where: {
        listings: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        category: true,
        listings: {
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            storePrice: true,
            pricePerUnit: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      take: 1000, // Limit to prevent huge response
    });

    // Calculate past sales volume for each product from order history
    const productsWithSales = await Promise.all(
      products.map(async (product) => {
        // Get all listing IDs for this product (all active listings)
        const listingIds = product.listings
          .map((l) => l.id)
          .filter((id): id is string => Boolean(id));

        let past_sales_volume = 0;
        if (listingIds.length > 0) {
          // Sum quantities from all order items for this product's listings
          const orderItems = await prisma.orderItem.findMany({
            where: {
              listingId: { in: listingIds },
              order: {
                paymentStatus: "SUCCESS", // Only count paid orders
                status: { not: "CANCELLED" },
              },
            },
            select: {
              quantity: true,
            },
          });

          past_sales_volume = orderItems.reduce(
            (sum, item) => sum + item.quantity,
            0,
          );
        }

        const price = product.listings[0]
          ? Number(
              product.listings[0].storePrice ||
                product.listings[0].pricePerUnit,
            )
          : 0;

        return {
          id: product.id,
          name: product.name,
          category: product.category,
          base_price: price,
          past_sales_volume,
          listing_id: product.listings[0]?.id || null,
        };
      }),
    );

    return NextResponse.json({
      categories: categories.map((c) => c.category),
      products: productsWithSales,
    });
  } catch (error: any) {
    console.error("Error fetching categories and products:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
