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
import { filterFarmersByDistance } from "@/lib/geocoding-distance";
import { parsePagination, createPaginatedResponse } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // For customers, filter farmers by distance (50km)
    let visibleFarmerIds: string[] | undefined;
    if (userId && session?.user?.role !== "ADMIN") {
      const customer = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          addresses: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (customer?.addresses?.[0]?.postalCode) {
        visibleFarmerIds = await filterFarmersByDistance(
          customer.addresses[0].postalCode,
        );
      }
    }

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

    // Filter by visible farmers for customers
    if (visibleFarmerIds !== undefined) {
      if (visibleFarmerIds.length === 0) {
        const emptyResponse = createPaginatedResponse([], 0, pagination);
        return createSuccessResponse(
          emptyResponse,
          "No farmers available in your area",
        );
      }
      // visibleFarmerIds contains farmer profile IDs, so filter by that
      where.farmerProfile = {
        id: { in: visibleFarmerIds },
      };
    }

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
