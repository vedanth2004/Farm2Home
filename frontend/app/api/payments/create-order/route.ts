import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createRazorpayOrder } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items, totalAmount, shippingAddress, discountAmount, couponCode } =
      await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items in cart" }, { status: 400 });
    }

    // First, create the database order with geocoded address
    // Geocode pincode to get coordinates, district, and other location data
    const { geocodePincode } = await import("@/lib/geocoding-distance");
    const locationData = await geocodePincode(shippingAddress.pincode);
    const latitude = locationData?.latitude || null;
    const longitude = locationData?.longitude || null;
    const district = locationData?.district || null;
    const geocodedCity = locationData?.city || shippingAddress.city;
    const geocodedState = locationData?.state || shippingAddress.city;

    const address = await prisma.address.create({
      data: {
        userId: session.user.id,
        line1: shippingAddress.address,
        city: geocodedCity || shippingAddress.city,
        district: district, // Store district from geocoding
        state: geocodedState || shippingAddress.city,
        postalCode: shippingAddress.pincode,
        country: "India",
        lat: latitude,
        lon: longitude,
      },
    });

    // Get listings for each product - use listingId from cart item if available
    const orderItems = [];
    for (const item of items) {
      // Use listingId from cart item if provided, otherwise find first active listing
      let listing;
      if (item.listingId) {
        listing = await prisma.productListing.findFirst({
          where: {
            id: item.listingId,
            productId: item.productId,
            isActive: true,
          },
        });
      } else {
        listing = await prisma.productListing.findFirst({
          where: {
            productId: item.productId,
            isActive: true,
          },
          orderBy: { createdAt: "desc" },
        });
      }

      if (listing) {
        orderItems.push({
          listingId: listing.id,
          quantity: item.quantity,
          unitPrice: item.price,
        });
      }
    }

    if (orderItems.length === 0) {
      return NextResponse.json(
        { error: "No valid product listings found" },
        { status: 400 },
      );
    }

    // Update coupon usage if applied
    if (couponCode) {
      await prisma.coupon.update({
        where: { code: couponCode },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      });
    }

    // Create order in database
    const order = await prisma.order.create({
      data: {
        customerId: session.user.id,
        totalAmount,
        discountAmount: discountAmount > 0 ? discountAmount : null,
        couponCode: couponCode || null,
        status: "CREATED",
        paymentStatus: "PENDING",
        shippingAddressId: address.id,
        items: {
          create: orderItems,
        },
      },
    });

    // Create Razorpay order (use final total after discount)
    const finalAmount = discountAmount
      ? totalAmount - discountAmount
      : totalAmount;
    const razorpayOrder = await createRazorpayOrder({
      amount: finalAmount,
      currency: "INR",
      receipt: order.id,
      notes: {
        orderId: order.id,
        customerId: session.user.id,
      },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: totalAmount,
        gateway: "RAZORPAY",
        gatewayOrderId: razorpayOrder.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating payment order:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 },
    );
  }
}
