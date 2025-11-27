import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch user's cart
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                farmer: {
                  include: {
                    user: {
                      select: {
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
                listings: {
                  where: { isActive: true },
                  take: 1,
                  orderBy: { createdAt: "desc" },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ items: [], total: 0, itemCount: 0 });
    }

    // Calculate totals and format items
    const items = cart.items.map((item) => {
      const activeListing = item.product.listings[0];
      const storePrice = activeListing
        ? Number(activeListing.storePrice || activeListing.pricePerUnit)
        : 0;

      return {
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        price: storePrice,
        quantity: item.quantity,
        unit: item.product.baseUnit,
        image: item.product.photos[0] || null,
        farmerName: item.product.farmer?.user?.name || "Unknown Farmer",
        availableStock: activeListing ? activeListing.availableQty : 0,
        listingId: activeListing?.id || null,
      };
    });

    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return NextResponse.json({
      items,
      total,
      itemCount,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId, listingId, quantity } = await request.json();

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Invalid product ID or quantity" },
        { status: 400 },
      );
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: session.user.id },
      });
    }

    // Check available stock - use specific listing if provided
    let activeListing;
    if (listingId) {
      activeListing = await prisma.productListing.findFirst({
        where: {
          id: listingId,
          productId,
          isActive: true,
        },
      });
    } else {
      activeListing = await prisma.productListing.findFirst({
        where: {
          productId,
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    console.log("Product ID:", productId);
    console.log("Active listing found:", !!activeListing);
    console.log("Available quantity:", activeListing?.availableQty);

    if (!activeListing) {
      return NextResponse.json(
        { error: "Product not available" },
        { status: 400 },
      );
    }

    // Get product with farmer info for farmer name
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        farmer: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    const newQuantity = existingItem
      ? existingItem.quantity + quantity
      : quantity;

    // Validate stock
    if (newQuantity > activeListing.availableQty) {
      return NextResponse.json(
        {
          error: "Insufficient stock",
          availableStock: activeListing.availableQty,
          requestedQuantity: newQuantity,
        },
        { status: 400 },
      );
    }

    // Update or create cart item
    if (existingItem) {
      console.log("Updating existing cart item:", existingItem.id);
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      console.log("Creating new cart item for product:", productId);
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    console.log("Cart item operation completed successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT - Update cart item quantity
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId, quantity } = await request.json();

    if (!productId || quantity < 0) {
      return NextResponse.json(
        { error: "Invalid product ID or quantity" },
        { status: 400 },
      );
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
    });

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    // Check available stock if quantity > 0
    if (quantity > 0) {
      const activeListing = await prisma.productListing.findFirst({
        where: {
          productId,
          isActive: true,
        },
      });

      if (!activeListing) {
        return NextResponse.json(
          { error: "Product not available" },
          { status: 400 },
        );
      }

      if (quantity > activeListing.availableQty) {
        return NextResponse.json(
          {
            error: "Insufficient stock",
            availableStock: activeListing.availableQty,
            requestedQuantity: quantity,
          },
          { status: 400 },
        );
      }
    }

    // Update or remove cart item
    if (quantity === 0) {
      await prisma.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          productId,
        },
      });
    } else {
      await prisma.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
        update: { quantity },
        create: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Remove item from cart
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 },
      );
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
    });

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
