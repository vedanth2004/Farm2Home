import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = session.user.id;

    // Get user account info
    const user = await prisma.user.findUnique({
      where: { id: customerId },
      select: {
        name: true,
        email: true,
        phone: true,
        loyaltyPoints: true,
        referralCode: true,
        createdAt: true,
        accountStatus: true,
      },
    });

    // Get cart items
    const cart = await prisma.cart.findUnique({
      where: { userId: customerId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                photos: true,
              },
            },
          },
        },
      },
    });

    const cart_items = cart?.items || [];
    const cart_total_items = cart_items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const cart_categories = cart_items.map((item) => item.product.category);
    const cart_category_counts: Record<string, number> = {};
    cart_categories.forEach((cat) => {
      cart_category_counts[cat] = (cart_category_counts[cat] || 0) + 1;
    });

    // Get wishlist items
    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId: customerId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            photos: true,
            averageRating: true,
            totalReviews: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Last 50 wishlist items
    });

    const wishlist_categories = wishlistItems.map(
      (item) => item.product.category,
    );
    const wishlist_category_counts: Record<string, number> = {};
    wishlist_categories.forEach((cat) => {
      wishlist_category_counts[cat] = (wishlist_category_counts[cat] || 0) + 1;
    });

    // Get reviews/feedback
    const reviews = await prisma.review.findMany({
      where: { authorId: customerId },
      select: {
        id: true,
        rating: true,
        comment: true,
        targetType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20, // Last 20 reviews
    });

    const avg_rating_given =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // Get customer order history
    const orders = await prisma.order.findMany({
      where: {
        customerId: customerId,
        paymentStatus: "SUCCESS",
        status: { not: "CANCELLED" },
      },
      include: {
        items: {
          include: {
            listing: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Last 100 orders
    });

    // Calculate customer metrics
    const total_orders = orders.length;
    const total_spend = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0,
    );

    // Calculate average order value
    const avg_order_value = total_orders > 0 ? total_spend / total_orders : 0;

    // Calculate total items bought
    const total_items_bought = orders.reduce((sum, order) => {
      return (
        sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
      );
    }, 0);

    // Get last purchase date
    const last_order = orders[0];
    const last_purchase_date = last_order?.createdAt
      ? new Date(last_order.createdAt).toISOString().split("T")[0]
      : null;

    // Calculate days since last order
    const days_since_last_order = last_order
      ? Math.floor(
          (Date.now() - new Date(last_order.createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 999; // Large number if no orders

    // Calculate average gap between orders
    let avg_gap_days = 0;
    if (orders.length > 1) {
      const gaps = [];
      for (let i = 0; i < orders.length - 1; i++) {
        const gap = Math.floor(
          (new Date(orders[i].createdAt).getTime() -
            new Date(orders[i + 1].createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (gap > 0) gaps.push(gap);
      }
      avg_gap_days =
        gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    } else if (orders.length === 1) {
      // For single order, estimate gap based on account age
      const accountAge = Math.floor(
        (Date.now() -
          new Date((session.user as any).createdAt || Date.now()).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      avg_gap_days = accountAge > 0 ? accountAge : 7;
    } else {
      avg_gap_days = 7; // Default
    }

    // Calculate purchase frequency (orders per month)
    const accountAgeDays = Math.floor(
      (Date.now() -
        new Date((session.user as any).createdAt || Date.now()).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const accountAgeMonths = accountAgeDays / 30;
    const purchase_frequency =
      accountAgeMonths > 0 ? total_orders / accountAgeMonths : total_orders;

    // Determine spend trend
    let spend_trend = "stable";
    if (orders.length >= 3) {
      const recent_orders = orders.slice(0, 3);
      const older_orders = orders.slice(3, 6);
      if (older_orders.length > 0) {
        const recent_avg =
          recent_orders.reduce((sum, o) => sum + Number(o.totalAmount), 0) /
          recent_orders.length;
        const older_avg =
          older_orders.reduce((sum, o) => sum + Number(o.totalAmount), 0) /
          older_orders.length;
        if (recent_avg > older_avg * 1.1) spend_trend = "increasing";
        else if (recent_avg < older_avg * 0.9) spend_trend = "decreasing";
      }
    }

    // Get most purchased category
    const categoryCounts: Record<string, number> = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const category = item.listing.product.category;
        categoryCounts[category] =
          (categoryCounts[category] || 0) + item.quantity;
      });
    });

    const category_preference =
      Object.keys(categoryCounts).length > 0
        ? Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0]
        : "Vegetables";

    return NextResponse.json({
      // Account Info
      id: customerId,
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
      loyalty_points: user?.loyaltyPoints || 0,
      referral_code: user?.referralCode,
      account_created: user?.createdAt?.toISOString(),
      account_status: user?.accountStatus,

      // Order History
      total_orders,
      total_spend,
      avg_order_value,
      total_items_bought,
      last_purchase_date,
      days_since_last_order,
      avg_gap_days,
      purchase_frequency,
      spend_trend,
      category_preference,

      // Cart Data
      cart_items: cart_items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        category: item.product.category,
        quantity: item.quantity,
      })),
      cart_total_items,
      cart_total_products: cart_items.length,
      cart_categories: Object.keys(cart_category_counts),
      cart_category_counts,

      // Wishlist Data
      wishlist_items: wishlistItems.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        category: item.product.category,
        rating: item.product.averageRating,
        reviews_count: item.product.totalReviews,
        added_at: item.createdAt.toISOString(),
      })),
      wishlist_total: wishlistItems.length,
      wishlist_categories: Object.keys(wishlist_category_counts),
      wishlist_category_counts,
      wishlist_preferred_category:
        Object.keys(wishlist_category_counts).length > 0
          ? Object.entries(wishlist_category_counts).sort(
              (a, b) => b[1] - a[1],
            )[0][0]
          : null,

      // Reviews/Feedback
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        type: r.targetType,
        created_at: r.createdAt.toISOString(),
      })),
      total_reviews: reviews.length,
      avg_rating_given,
      reviews_by_type: {
        product: reviews.filter((r) => r.targetType === "PRODUCT").length,
        delivery: reviews.filter((r) => r.targetType === "DELIVERY").length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching customer data:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
