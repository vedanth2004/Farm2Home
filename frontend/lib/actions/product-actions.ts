"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
// Define ProductDraftStatus type manually
type ProductDraftStatus =
  | "PENDING"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED";

export async function approveProduct(draftId: string) {
  try {
    console.log("Starting product approval for draftId:", draftId);
    const session = await requirePermission("approve:products");
    console.log("Session user ID:", session.user.id);

    // First check if draft exists
    const existingDraft = await prisma.productDraft.findUnique({
      where: { id: draftId },
      include: { product: true },
    });

    if (!existingDraft) {
      console.error("Draft not found:", draftId);
      return { error: "Product draft not found" };
    }

    console.log(
      "Found draft:",
      existingDraft.id,
      "Status:",
      existingDraft.status,
    );

    // Update draft status
    const draft = await prisma.productDraft.update({
      where: { id: draftId },
      data: { status: "APPROVED" },
      include: {
        product: true,
      },
    });
    console.log("Draft updated:", draft.id);

    // Check if listing already exists
    const existingListing = await prisma.productListing.findFirst({
      where: {
        productId: draft.productId,
      },
    });

    let listing;
    if (existingListing) {
      // Update existing listing
      listing = await prisma.productListing.update({
        where: { id: existingListing.id },
        data: {
          pricePerUnit: (draft as any).storePrice || draft.pricePerUnit, // Use store price if set, fallback to old price
          farmerPrice: (draft as any).farmerPrice || draft.pricePerUnit, // Set farmer price
          storePrice: (draft as any).storePrice || draft.pricePerUnit, // Set store price
          availableQty: draft.availableQty,
          isActive: true,
          approvedBy: session.user.id,
          approvedAt: new Date(),
          margin:
            (draft as any).storePrice && (draft as any).farmerPrice
              ? ((Number((draft as any).storePrice) -
                  Number((draft as any).farmerPrice)) /
                  Number((draft as any).farmerPrice)) *
                100
              : 0,
        } as any,
      });
      console.log("Product listing updated:", listing.id);
    } else {
      // Create new listing
      listing = await prisma.productListing.create({
        data: {
          productId: draft.productId,
          pricePerUnit: (draft as any).storePrice || draft.pricePerUnit, // Use store price if set, fallback to old price
          farmerPrice: (draft as any).farmerPrice || draft.pricePerUnit, // Set farmer price
          storePrice: (draft as any).storePrice || draft.pricePerUnit, // Set store price
          availableQty: draft.availableQty,
          isActive: true,
          approvedBy: session.user.id,
          approvedAt: new Date(),
          margin:
            (draft as any).storePrice && (draft as any).farmerPrice
              ? ((Number((draft as any).storePrice) -
                  Number((draft as any).farmerPrice)) /
                  Number((draft as any).farmerPrice)) *
                100
              : 0,
        } as any,
      });
      console.log("Product listing created:", listing.id);
    }

    return { success: true, draft };
  } catch (error) {
    console.error("Error approving product:", error);
    return {
      error: `Failed to approve product: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function rejectProduct(draftId: string, reason?: string) {
  try {
    await requirePermission("approve:products");

    const draft = await prisma.productDraft.update({
      where: { id: draftId },
      data: {
        status: "REJECTED",
        adminNote: reason || null,
      },
    });

    return { success: true, draft };
  } catch (error) {
    console.error("Error rejecting product:", error);
    return { error: "Failed to reject product" };
  }
}

export async function requestProductChanges(draftId: string, note: string) {
  try {
    await requirePermission("approve:products");

    const draft = await prisma.productDraft.update({
      where: { id: draftId },
      data: {
        status: "CHANGES_REQUESTED",
        adminNote: note,
      },
    });

    return { success: true, draft };
  } catch (error) {
    console.error("Error requesting product changes:", error);
    return { error: "Failed to request product changes" };
  }
}

export async function searchProducts(query: string, status?: string) {
  try {
    await requirePermission("read:products");

    const where: any = {
      OR: [
        { product: { name: { contains: query, mode: "insensitive" } } },
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

    return { success: true, drafts };
  } catch (error) {
    console.error("Error searching products:", error);
    return { error: "Failed to search products" };
  }
}
