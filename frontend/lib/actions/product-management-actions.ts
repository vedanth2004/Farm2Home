"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function deleteProduct(productId: string) {
  try {
    await requirePermission("write:products");

    // Delete the product (this will cascade delete related records)
    await prisma.product.delete({
      where: { id: productId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { error: "Failed to delete product" };
  }
}

export async function updateProduct(productId: string, formData: FormData) {
  try {
    await requirePermission("write:products");

    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    const baseUnit = formData.get("baseUnit") as string;

    if (!name || !category || !description || !baseUnit) {
      return { error: "Missing required fields" };
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        category,
        description,
        baseUnit,
      },
    });

    return { success: true, product };
  } catch (error) {
    console.error("Error updating product:", error);
    return { error: "Failed to update product" };
  }
}

export async function searchProducts(query: string, category?: string) {
  try {
    await requirePermission("read:products");

    const where: any = {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        {
          farmer: { user: { name: { contains: query, mode: "insensitive" } } },
        },
      ],
    };

    if (category && category !== "ALL") {
      where.category = category;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        farmer: {
          include: {
            user: true,
          },
        },
        listings: {
          where: {
            isActive: true,
          },
        },
        drafts: {
          where: {
            status: "PENDING",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, products };
  } catch (error) {
    console.error("Error searching products:", error);
    return { error: "Failed to search products" };
  }
}
