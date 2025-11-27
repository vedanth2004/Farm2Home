"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function bulkApproveProducts(draftIds: string[]) {
  try {
    await requirePermission("approve:products");

    const results = [];
    for (const draftId of draftIds) {
      try {
        // Get the draft
        const draft = await prisma.productDraft.findUnique({
          where: { id: draftId },
          include: { product: true },
        });

        if (!draft) {
          results.push({
            id: draftId,
            success: false,
            error: "Draft not found",
          });
          continue;
        }

        // Update draft status
        await prisma.productDraft.update({
          where: { id: draftId },
          data: { status: "APPROVED" },
        });

        // Check if listing already exists
        const existingListing = await prisma.productListing.findFirst({
          where: { productId: draft.productId },
        });

        if (existingListing) {
          // Update existing listing
          await prisma.productListing.update({
            where: { id: existingListing.id },
            data: {
              pricePerUnit: draft.pricePerUnit,
              availableQty: draft.availableQty,
              isActive: true,
              approvedBy: "admin", // You might want to get this from session
              approvedAt: new Date(),
            },
          });
        } else {
          // Create new listing
          await prisma.productListing.create({
            data: {
              productId: draft.productId,
              pricePerUnit: draft.pricePerUnit,
              availableQty: draft.availableQty,
              isActive: true,
              approvedBy: "admin", // You might want to get this from session
              approvedAt: new Date(),
            },
          });
        }

        results.push({ id: draftId, success: true });
      } catch (error) {
        results.push({
          id: draftId,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      success: true,
      message: `Bulk approval completed: ${successCount} approved, ${failureCount} failed`,
      results,
    };
  } catch (error) {
    console.error("Error in bulk approve:", error);
    return { error: "Failed to bulk approve products" };
  }
}

export async function bulkRejectProducts(draftIds: string[], reason: string) {
  try {
    await requirePermission("approve:products");

    const results = [];
    for (const draftId of draftIds) {
      try {
        await prisma.productDraft.update({
          where: { id: draftId },
          data: {
            status: "REJECTED",
            adminNote: reason,
          },
        });
        results.push({ id: draftId, success: true });
      } catch (error) {
        results.push({
          id: draftId,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      success: true,
      message: `Bulk rejection completed: ${successCount} rejected, ${failureCount} failed`,
      results,
    };
  } catch (error) {
    console.error("Error in bulk reject:", error);
    return { error: "Failed to bulk reject products" };
  }
}

export async function searchProductDrafts(
  query: string,
  status?: string,
  category?: string,
) {
  try {
    await requirePermission("read:products");

    const where: any = {
      OR: [
        { product: { name: { contains: query, mode: "insensitive" } } },
        { product: { description: { contains: query, mode: "insensitive" } } },
        {
          product: {
            farmer: {
              user: { name: { contains: query, mode: "insensitive" } },
            },
          },
        },
      ],
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (category && category !== "ALL") {
      where.product = { ...where.product, category };
    }

    const drafts = await prisma.productDraft.findMany({
      where,
      include: {
        product: {
          include: {
            farmer: {
              include: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert Decimal to number for client components
    const convertedDrafts = drafts.map((draft: any) => ({
      ...draft,
      pricePerUnit: Number(draft.pricePerUnit),
    }));

    return { success: true, drafts: convertedDrafts };
  } catch (error) {
    console.error("Error searching product drafts:", error);
    return { error: "Failed to search product drafts" };
  }
}

export async function getApprovalStats() {
  try {
    await requirePermission("read:products");

    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      changesRequestedCount,
      thisWeekCount,
    ] = await Promise.all([
      prisma.productDraft.count({ where: { status: "PENDING" } }),
      prisma.productDraft.count({ where: { status: "APPROVED" } }),
      prisma.productDraft.count({ where: { status: "REJECTED" } }),
      prisma.productDraft.count({ where: { status: "CHANGES_REQUESTED" } }),
      prisma.productDraft.count({
        where: {
          status: "PENDING",
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      success: true,
      stats: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        changesRequested: changesRequestedCount,
        thisWeek: thisWeekCount,
      },
    };
  } catch (error) {
    console.error("Error fetching approval stats:", error);
    return { error: "Failed to fetch approval stats" };
  }
}
