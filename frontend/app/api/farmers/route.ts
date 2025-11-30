/**
 * API Route: Get all farmers visible to customer (within 50km)
 * GET /api/farmers
 * Returns list of farmers with their products
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// Distance filtering removed - customers can see all farmers
import { parsePagination, createPaginatedResponse } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Pagination
    const pagination = parsePagination(request, 50);

    // Build where clause
    const where: any = {
      role: "FARMER",
      accountStatus: "APPROVED",
      farmerProfile: {
        isNot: null,
      },
    };

    // Distance filtering removed - all customers can see all farmers

    // Get search query
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get("search");

    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: "insensitive" } },
        { email: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    const [farmers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: {
          farmerProfile: {
            include: {
              products: {
                where: {
                  listings: {
                    some: {
                      isActive: true,
                    },
                  },
                },
                include: {
                  listings: {
                    where: {
                      isActive: true,
                    },
                    take: 1,
                  },
                },
              },
            },
          },
          addresses: {
            where: {
              lat: { not: null },
              lon: { not: null },
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Format farmers with product counts
    const formattedFarmers = farmers.map((farmer) => ({
      id: farmer.farmerProfile?.id,
      userId: farmer.id,
      name: farmer.name,
      email: farmer.email,
      phone: farmer.phone,
      verified: farmer.farmerProfile?.verified || false,
      location: farmer.addresses[0]
        ? `${farmer.addresses[0].city || ""}, ${farmer.addresses[0].state || ""}`
        : "Location not available",
      productCount: farmer.farmerProfile?.products.length || 0,
      displayId: farmer.displayId,
      createdAt: farmer.createdAt,
    }));

    const response = createPaginatedResponse(
      formattedFarmers,
      total,
      pagination,
    );

    return createSuccessResponse(response, "Farmers fetched successfully");
  } catch (error) {
    console.error("Error fetching farmers:", error);
    return createErrorResponse(error);
  }
}
