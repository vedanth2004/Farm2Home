import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST - Create a new review for a product
 * Body: { productId, rating, comment }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse({ message: "Unauthorized" }, 401);
    }

    const body = await request.json();
    const { productId, rating, comment } = body;

    if (!productId || !rating) {
      return createErrorResponse(
        { message: "Product ID and rating are required" },
        400,
      );
    }

    if (rating < 1 || rating > 5) {
      return createErrorResponse(
        { message: "Rating must be between 1 and 5" },
        400,
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { farmer: true },
    });

    if (!product) {
      return createErrorResponse({ message: "Product not found" }, 404);
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findFirst({
      where: {
        authorId: session.user.id,
        targetType: "PRODUCT",
        targetId: productId,
      },
    });

    if (existingReview) {
      return createErrorResponse(
        { message: "You have already reviewed this product" },
        400,
      );
    }

    // Create review with PENDING status
    const review = await prisma.review.create({
      data: {
        authorId: session.user.id,
        targetType: "PRODUCT",
        targetId: productId,
        productId: productId,
        farmerId: product.farmerId,
        rating: rating,
        comment: comment || null,
        status: "PENDING",
        isModerated: false,
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return createSuccessResponse(
      review,
      "Review submitted successfully. It will be visible after admin approval.",
    );
  } catch (error) {
    console.error("Error creating review:", error);
    return createErrorResponse(error);
  }
}

/**
 * GET - Get reviews for a product
 * Query params: productId
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");

    if (!productId) {
      return createErrorResponse({ message: "Product ID is required" }, 400);
    }

    // Get only approved reviews
    const reviews = await prisma.review.findMany({
      where: {
        productId: productId,
        targetType: "PRODUCT",
        status: "APPROVED",
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return createSuccessResponse(reviews, "Reviews fetched successfully");
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return createErrorResponse(error);
  }
}
