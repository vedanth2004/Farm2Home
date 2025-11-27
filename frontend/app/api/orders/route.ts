import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireCustomer,
  parseRequestBody,
  validateRequiredFields,
  createSuccessResponse,
  createErrorResponse,
  validatePositiveNumber,
} from "@/lib/api/utils";
import {
  findNearestAgentForDelivery,
  calculateHaversineDistance,
  findNearestCRForFarmer,
} from "@/lib/geocoding-distance";
import { CreateOrderRequest } from "@/lib/types/api";
import { validateInventory, reserveInventory } from "@/lib/inventory";

export async function POST(request: NextRequest) {
  try {
    // Get current user and validate permissions
    const user = await getCurrentUser();
    requireCustomer(user.role);

    // Parse and validate request body
    const body = await parseRequestBody<CreateOrderRequest>(request);
    validateRequiredFields(body, [
      "customerId",
      "items",
      "totalAmount",
      "shippingAddress",
    ]);
    validatePositiveNumber(body.totalAmount, "totalAmount");

    // Handle payment method (default to razorpay if not specified)
    const paymentMethod = (body as any).paymentMethod || "razorpay";
    const couponCode = (body as any).couponCode || null;
    const discountAmount = (body as any).discountAmount || 0;

    console.log("=== ORDER CREATION DEBUG ===");
    console.log("Payment method:", paymentMethod);
    console.log("Customer ID:", body.customerId);
    console.log("Total amount:", body.totalAmount);
    console.log("Coupon code:", couponCode);
    console.log("Discount amount:", discountAmount);
    console.log("Items count:", body.items.length);

    console.log("Order creation request:", {
      customerId: body.customerId,
      items: body.items,
      totalAmount: body.totalAmount,
      shippingAddress: body.shippingAddress,
    });

    // Verify that the customer is actually a customer (not a farmer)
    const customer = await prisma.user.findUnique({
      where: { id: body.customerId },
      select: { role: true, name: true },
    });

    if (!customer) {
      return createErrorResponse(new Error("Customer not found"), 404);
    }

    if (customer.role !== "CUSTOMER") {
      console.log(
        `Invalid order attempt: ${customer.name} (${customer.role}) tried to place an order`,
      );
      return createErrorResponse(
        new Error("Only customers can place orders"),
        403,
      );
    }

    // First, create or find the shipping address with geocoding
    console.log("Creating address for user:", body.customerId);

    // Geocode pincode to get coordinates, district, and other location data
    const { geocodePincode } = await import("@/lib/geocoding-distance");
    const locationData = await geocodePincode(body.shippingAddress.pincode);
    const latitude = locationData?.latitude || null;
    const longitude = locationData?.longitude || null;
    const district = locationData?.district || null;
    const geocodedCity = locationData?.city || body.shippingAddress.city;
    const geocodedState = locationData?.state || body.shippingAddress.city;

    const address = await prisma.address.create({
      data: {
        userId: body.customerId,
        line1: body.shippingAddress.address,
        city: geocodedCity || body.shippingAddress.city,
        district: district, // Store district from geocoding
        state: geocodedState || body.shippingAddress.city,
        postalCode: body.shippingAddress.pincode,
        country: "India",
        lat: latitude,
        lon: longitude,
      },
    });
    console.log("Address created:", address.id);

    // Get listings for each product - use listingId from cart item if available
    console.log("Processing items:", body.items.length);
    const orderItems: Array<{
      listingId: string;
      quantity: number;
      unitPrice: number;
      farmerPrice: number;
      platformFee: number;
      adminProfit: number;
    }> = [];
    for (const item of body.items) {
      console.log("Looking for listing for product:", item.productId);

      // Use listingId from cart item if provided, otherwise find first active listing
      let listing;
      const itemWithListing = item as typeof item & { listingId?: string };
      if (itemWithListing.listingId) {
        listing = await prisma.productListing.findFirst({
          where: {
            id: itemWithListing.listingId,
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
        console.log("Found listing:", listing.id);
        const storePrice = Number(
          (listing as any).storePrice || listing.pricePerUnit,
        );
        const farmerPrice = Number(
          (listing as any).farmerPrice || listing.pricePerUnit,
        );
        const platformFee = storePrice - farmerPrice;
        const adminProfit = platformFee * item.quantity; // Admin profit: (unitPrice - farmerPrice) × quantity

        orderItems.push({
          listingId: listing.id,
          quantity: item.quantity,
          unitPrice: storePrice, // Store price (what customer paid)
          farmerPrice: farmerPrice, // Farmer's price (what farmer gets)
          platformFee: platformFee, // Platform margin per unit
          adminProfit: adminProfit, // Admin profit for this item: (unitPrice - farmerPrice) × quantity
        });
      } else {
        console.log("No active listing found for product:", item.productId);
      }
    }

    if (orderItems.length === 0) {
      console.log("No valid listings found for any items");
      return createErrorResponse(
        new Error("No valid product listings found"),
        400,
      );
    }

    // Collect farmer locations for pickup agent assignment (before creating order)
    const farmerLocations = new Set<string>();
    if (paymentMethod === "cod") {
      console.log("=== COLLECTING FARMER LOCATIONS FOR COD ORDER ===");
      console.log("Order items to process:", orderItems.length);

      for (const item of orderItems) {
        console.log("Processing item with listingId:", item.listingId);

        // Get the farmer from the listing
        const listing = await prisma.productListing.findUnique({
          where: { id: item.listingId },
          include: {
            product: {
              include: {
                farmer: {
                  include: {
                    user: {
                      include: {
                        addresses: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        console.log("Listing found:", !!listing);
        console.log("Farmer found:", !!listing?.product?.farmer);
        console.log("Farmer user found:", !!listing?.product?.farmer?.user);
        console.log(
          "Addresses found:",
          listing?.product?.farmer?.user?.addresses?.length || 0,
        );

        if (
          listing?.product?.farmer?.user?.addresses &&
          listing.product.farmer.user.addresses.length > 0
        ) {
          const farmerAddress = listing.product.farmer.user.addresses[0];
          console.log(
            "Adding farmer location - City:",
            farmerAddress.city,
            "Pincode:",
            farmerAddress.postalCode,
          );
          farmerLocations.add(farmerAddress.postalCode);
          farmerLocations.add(farmerAddress.city);
        }
      }

      console.log("=== FARMER LOCATIONS COLLECTED ===");
      console.log("Locations set:", Array.from(farmerLocations));
    }

    // Create order with inventory management
    console.log("Creating order with items:", orderItems.length);
    const order = await prisma.$transaction(async (tx) => {
      // First, validate and reserve inventory
      for (const item of orderItems) {
        const listing = await tx.productListing.findUnique({
          where: { id: item.listingId },
        });

        if (!listing) {
          throw new Error(`Product listing not found: ${item.listingId}`);
        }

        if (listing.availableQty < item.quantity) {
          throw new Error(
            `Insufficient inventory for product ${listing.id}. Available: ${listing.availableQty}, Requested: ${item.quantity}`,
          );
        }

        // Reserve inventory (decrease available quantity)
        await tx.productListing.update({
          where: { id: item.listingId },
          data: {
            availableQty: {
              decrement: item.quantity,
            },
          },
        });

        // Create inventory transaction record
        await tx.inventoryTransaction.create({
          data: {
            listingId: item.listingId,
            delta: -item.quantity, // Negative delta for reservation
            reason: "ORDER_RESERVE",
          },
        });
      }

      // Update coupon usage if applied
      if (couponCode) {
        await tx.coupon.update({
          where: { code: couponCode },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      // Find CR for the first farmer in the order (for tracking)
      // Note: If order has multiple farmers, we use the first farmer's CR
      // CR gets monthly salary (fixed by admin), so crId is just for tracking
      let assignedCRId: string | null = null;
      if (orderItems.length > 0) {
        // Get farmer from first item's listing
        const firstListing = await tx.productListing.findUnique({
          where: { id: orderItems[0].listingId },
          include: {
            product: {
              include: {
                farmer: {
                  include: {
                    user: {
                      include: {
                        addresses: {
                          where: {
                            lat: { not: null },
                            lon: { not: null },
                          },
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (firstListing?.product?.farmer?.user?.addresses?.[0]?.postalCode) {
          const farmerPincode =
            firstListing.product.farmer.user.addresses[0].postalCode;
          const crAssignment = await findNearestCRForFarmer(farmerPincode);
          if (crAssignment.crFound && crAssignment.crId) {
            assignedCRId = crAssignment.crId;
          }
        }
      }

      // Create the order
      return await tx.order.create({
        data: {
          customerId: body.customerId,
          totalAmount: body.totalAmount,
          discountAmount: discountAmount > 0 ? discountAmount : null,
          couponCode: couponCode,
          status: "CREATED",
          paymentStatus: "PENDING",
          shippingAddressId: address.id,
          crId: assignedCRId, // CR assigned to this order (for tracking, CR gets monthly salary)
          items: {
            create: orderItems,
          },
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
      });
    });

    // Assign pickup agent for COD orders using Haversine distance (30km radius)
    // Order Assignment Logic: Finds agents within 30km, assigns closest available agent
    let assignedPickupAgent = null;
    if (paymentMethod === "cod") {
      console.log("=== ASSIGNING PICKUP AGENT USING HAVERSINE DISTANCE ===");

      // Get customer's address to find their pincode for agent assignment
      const customerAddress = await prisma.address.findUnique({
        where: { id: address.id },
      });

      if (customerAddress?.postalCode) {
        console.log(
          "Customer pincode for agent assignment:",
          customerAddress.postalCode,
        );

        // Find nearest agent within 30km using Haversine formula
        const agentAssignment = await findNearestAgentForDelivery(
          customerAddress.postalCode,
        );

        if (agentAssignment.agentFound) {
          const pickupAgent = await prisma.pickupAgentProfile.findUnique({
            where: { id: agentAssignment.agentId! },
            include: {
              user: true,
            },
          });

          if (pickupAgent) {
            console.log("Pickup agent found (Haversine):", {
              id: pickupAgent.id,
              name: pickupAgent.user.name,
              distanceKm: agentAssignment.distanceKm?.toFixed(2),
            });

            // Calculate delivery distance and agent fee
            const deliveryDistance = agentAssignment.distanceKm || 0;

            // If customer and agent have same pincode, use fixed commission (20-30 rupees)
            let agentFee: number;
            if (customerAddress.postalCode === agentAssignment.agentPincode) {
              // Same pincode: random commission between 20-30 rupees
              agentFee = Math.floor(Math.random() * 11) + 20; // Random between 20-30
            } else {
              // Different pincode: 8 rupees per kilometer
              const agentFeePerKm = 8;
              agentFee = deliveryDistance * agentFeePerKm;
            }

            // Create pickup job with distance and fee
            const pickupJob = await prisma.pickupJob.create({
              data: {
                orderId: order.id,
                agentId: pickupAgent.id,
                status: "ACCEPTED",
                deliveryDistance: deliveryDistance, // Store calculated distance
                agentFee: agentFee, // Store agent fee (8 rupees × distance or 20-30 for same pincode)
              },
            });

            console.log("Pickup job created with ID:", pickupJob.id);

            assignedPickupAgent = {
              id: pickupAgent.id,
              name: pickupAgent.user.name,
              email: pickupAgent.user.email,
              phone: pickupAgent.user.phone,
              pickupJobId: pickupJob.id,
              distanceKm: agentAssignment.distanceKm,
            };

            console.log(
              "=== PICKUP AGENT ASSIGNED SUCCESSFULLY (HAVERSINE) ===",
              assignedPickupAgent,
            );
          }
        } else {
          console.log(
            "=== NO PICKUP AGENT FOUND WITHIN 30KM ===",
            agentAssignment.reason,
          );
        }
      } else {
        console.log("=== NO CUSTOMER ADDRESS FOR AGENT ASSIGNMENT ===");
      }

      // Validate farmers are within 50km (should already be validated via product visibility)
      // This is a safety check to ensure all farmers in order are within pickup range
      console.log("=== VALIDATING FARMER DISTANCES (50KM) ===");
      if (farmerLocations.size > 0) {
        const customerLocation = await prisma.address.findUnique({
          where: { id: address.id },
          select: { lat: true, lon: true, postalCode: true },
        });

        if (customerLocation?.lat && customerLocation?.lon) {
          // Check each farmer's distance
          for (const item of order.items) {
            const farmerData = await prisma.productListing.findUnique({
              where: { id: item.listingId },
              include: {
                product: {
                  include: {
                    farmer: {
                      include: {
                        user: {
                          include: {
                            addresses: {
                              where: {
                                lat: { not: null },
                                lon: { not: null },
                              },
                              take: 1,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            });

            if (!farmerData) {
              console.warn(
                `⚠️ WARNING: Could not find listing ${item.listingId}`,
              );
              continue;
            }

            const farmerAddress =
              farmerData?.product?.farmer?.user?.addresses?.[0];
            if (farmerAddress?.lat && farmerAddress?.lon) {
              const distance = calculateHaversineDistance(
                customerLocation.lat,
                customerLocation.lon,
                farmerAddress.lat,
                farmerAddress.lon,
              );

              console.log(
                `Farmer ${farmerData.product.farmer.id}: ${distance.toFixed(2)} km from customer`,
              );

              if (distance > 50) {
                console.warn(
                  `⚠️ WARNING: Farmer ${farmerData.product.farmer.id} is ${distance.toFixed(2)} km away (exceeds 50km limit)`,
                );
              }
            }
          }
        }
      }
    }

    console.log("Order created successfully:", order.id);

    // Create earnings records for farmers
    const createdEarnings = [];
    const adminRevenueRecords = [];

    for (const item of order.items) {
      const farmerId = item.listing.product.farmerId;
      const farmerPrice = Number((item as any).farmerPrice || 0);
      const adminProfit = Number((item as any).adminProfit || 0);
      const quantity = item.quantity;
      const earningsAmount = farmerPrice * quantity;

      // Create farmer earnings
      if (earningsAmount > 0) {
        const earnings = await (prisma as any).earnings.create({
          data: {
            farmerId,
            orderId: order.id,
            orderItemId: item.id,
            amount: earningsAmount,
            status: "PENDING" as any,
          },
        });

        createdEarnings.push(earnings);
      }

      // Create admin revenue record (store admin profit)
      if (adminProfit > 0) {
        const adminRevenue = await prisma.adminRevenue.create({
          data: {
            orderId: order.id,
            orderItemId: item.id,
            amount: adminProfit,
          },
        });

        adminRevenueRecords.push(adminRevenue);
      }
    }

    console.log(`Created ${createdEarnings.length} earnings records`);
    console.log(`Created ${adminRevenueRecords.length} admin revenue records`);

    return createSuccessResponse(
      {
        ...order,
        earnings: createdEarnings,
        assignedPickupAgent,
        paymentMethod,
      },
      "Order created successfully",
      201,
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return createErrorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireCustomer(user.role);

    const orders = await prisma.order.findMany({
      where: {
        customerId: user.id,
      },
      include: {
        customer: true,
        items: {
          include: {
            listing: {
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
            },
          },
        },
        shippingAddress: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return createSuccessResponse(orders, "Orders fetched successfully");
  } catch (error) {
    console.error("Error fetching orders:", error);
    return createErrorResponse(error);
  }
}
