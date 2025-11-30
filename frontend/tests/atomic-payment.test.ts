import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  handleAtomicPaymentSuccess,
  handleAtomicPaymentFailure,
} from "@/lib/atomic-payment";

const prisma = new PrismaClient();

describe("Atomic Payment Processing", () => {
  let testOrderId: string;
  let testCustomerId: string;
  let testFarmerId: string;
  let testProductId: string;
  let testListingId: string;

  beforeEach(async () => {
    // Create test data
    const customer = await prisma.user.create({
      data: {
        name: "Test Customer",
        email: "test-customer@example.com",
        role: "CUSTOMER",
      },
    });

    const farmer = await prisma.user.create({
      data: {
        name: "Test Farmer",
        email: "test-farmer@example.com",
        role: "FARMER",
      },
    });

    const farmerProfile = await prisma.farmerProfile.create({
      data: {
        userId: farmer.id,
        govtId: "TEST123",
        upiId: "test@upi",
        verified: true,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: "Test Product",
        description: "Test Description",
        category: "VEGETABLES",
        baseUnit: "kg",
        farmerId: farmerProfile.id,
        photos: ["test.jpg"],
      },
    });

    const listing = await prisma.productListing.create({
      data: {
        productId: product.id,
        pricePerUnit: 50,
        farmerPrice: 40,
        storePrice: 50,
        availableQty: 100,
        isActive: true,
      },
    });

    const address = await prisma.address.create({
      data: {
        userId: customer.id,
        line1: "Test Address",
        city: "Test City",
        state: "Test State",
        postalCode: "123456",
        country: "India",
      },
    });

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        totalAmount: 100,
        status: "CREATED",
        paymentStatus: "PENDING",
        shippingAddressId: address.id,
        items: {
          create: {
            listingId: listing.id,
            quantity: 2,
            unitPrice: 50,
            farmerPrice: 40,
            platformFee: 10,
          },
        },
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 100,
        gateway: "RAZORPAY",
        gatewayOrderId: "test-razorpay-order",
        status: "PENDING",
      },
    });

    // Store IDs for cleanup
    testOrderId = order.id;
    testCustomerId = customer.id;
    testFarmerId = farmerProfile.id;
    testProductId = product.id;
    testListingId = listing.id;
  });

  afterEach(async () => {
    // Cleanup test data
    await prisma.earnings.deleteMany({
      where: { orderId: testOrderId },
    });
    // Delete inventory transactions through order items -> listings
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: testOrderId },
      select: { listingId: true },
    });
    const listingIds = orderItems.map((item) => item.listingId);
    if (listingIds.length > 0) {
      await prisma.inventoryTransaction.deleteMany({
        where: { listingId: { in: listingIds } },
      });
    }
    await prisma.pickupJob.deleteMany({
      where: { orderId: testOrderId },
    });
    await prisma.payment.deleteMany({
      where: { orderId: testOrderId },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: testOrderId },
    });
    await prisma.order.delete({
      where: { id: testOrderId },
    });
    await prisma.address.deleteMany({
      where: { userId: testCustomerId },
    });
    await prisma.productListing.delete({
      where: { id: testListingId },
    });
    await prisma.product.delete({
      where: { id: testProductId },
    });
    await prisma.farmerProfile.delete({
      where: { id: testFarmerId },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [testCustomerId, testFarmerId] },
      },
    });
  });

  it("should process payment success atomically", async () => {
    const result = await handleAtomicPaymentSuccess({
      orderId: testOrderId,
      razorpayOrderId: "test-razorpay-order",
      razorpayPaymentId: "test-payment-id",
      amount: 100,
      correlationId: "test-correlation-id",
    });

    expect(result.success).toBe(true);
    if ("earningsCreated" in result) {
      expect(result.earningsCreated).toBe(1);
    } else {
      throw new Error("Expected earningsCreated in result");
    }

    // Verify payment was updated
    const payment = await prisma.payment.findFirst({
      where: { orderId: testOrderId },
    });
    expect(payment?.status).toBe("SUCCESS");
    expect(payment?.gatewayPaymentId).toBe("test-payment-id");

    // Verify order was updated
    const order = await prisma.order.findUnique({
      where: { id: testOrderId },
    });
    expect(order?.status).toBe("PAID");
    expect(order?.paymentStatus).toBe("SUCCESS");

    // Verify earnings were created
    const earnings = await prisma.earnings.findMany({
      where: { orderId: testOrderId },
    });
    expect(earnings).toHaveLength(1);
    expect(Number(earnings[0].amount)).toBe(80); // 40 * 2 quantity
    expect(earnings[0].status).toBe("PENDING");

    // Verify inventory was updated
    const listing = await prisma.productListing.findUnique({
      where: { id: testListingId },
    });
    expect(listing?.availableQty).toBe(98); // 100 - 2

    // Verify inventory transaction was created (through listing)
    const inventoryTransaction = await prisma.inventoryTransaction.findFirst({
      where: { listingId: testListingId },
    });
    expect(inventoryTransaction?.delta).toBe(-2);
    expect(inventoryTransaction?.reason).toBe("ORDER_RESERVE");

    // Verify pickup job was created
    const pickupJob = await prisma.pickupJob.findFirst({
      where: { orderId: testOrderId },
    });
    expect(pickupJob?.status).toBe("REQUESTED");
  });

  it("should handle payment failure atomically", async () => {
    const result = await handleAtomicPaymentFailure({
      orderId: testOrderId,
      razorpayOrderId: "test-razorpay-order",
      correlationId: "test-correlation-id",
    });

    expect(result.success).toBe(true);

    // Verify payment was updated
    const payment = await prisma.payment.findFirst({
      where: { orderId: testOrderId },
    });
    expect(payment?.status).toBe("FAILED");

    // Verify order was updated
    const order = await prisma.order.findUnique({
      where: { id: testOrderId },
    });
    expect(order?.status).toBe("CANCELLED");
    expect(order?.paymentStatus).toBe("FAILED");

    // Verify no earnings were created
    const earnings = await prisma.earnings.findMany({
      where: { orderId: testOrderId },
    });
    expect(earnings).toHaveLength(0);

    // Verify inventory was not updated
    const listing = await prisma.productListing.findUnique({
      where: { id: testListingId },
    });
    expect(listing?.availableQty).toBe(100); // Unchanged
  });

  it("should prevent double processing", async () => {
    // Process payment first time
    await handleAtomicPaymentSuccess({
      orderId: testOrderId,
      razorpayOrderId: "test-razorpay-order",
      razorpayPaymentId: "test-payment-id",
      amount: 100,
      correlationId: "test-correlation-id-1",
    });

    // Try to process again
    const result = await handleAtomicPaymentSuccess({
      orderId: testOrderId,
      razorpayOrderId: "test-razorpay-order",
      razorpayPaymentId: "test-payment-id-2",
      amount: 100,
      correlationId: "test-correlation-id-2",
    });

    expect(result.success).toBe(true);
    if ("message" in result) {
      expect(result.message).toBe("Order already processed");
    } else {
      throw new Error("Expected message in result for double processing");
    }

    // Verify only one set of earnings exists
    const earnings = await prisma.earnings.findMany({
      where: { orderId: testOrderId },
    });
    expect(earnings).toHaveLength(1);
  });

  it("should handle insufficient inventory", async () => {
    // Update listing to have insufficient inventory
    await prisma.productListing.update({
      where: { id: testListingId },
      data: { availableQty: 1 },
    });

    await expect(
      handleAtomicPaymentSuccess({
        orderId: testOrderId,
        razorpayOrderId: "test-razorpay-order",
        razorpayPaymentId: "test-payment-id",
        amount: 100,
        correlationId: "test-correlation-id",
      }),
    ).rejects.toThrow("Insufficient inventory");

    // Verify order was not updated
    const order = await prisma.order.findUnique({
      where: { id: testOrderId },
    });
    expect(order?.status).toBe("CREATED");
    expect(order?.paymentStatus).toBe("PENDING");

    // Verify no earnings were created
    const earnings = await prisma.earnings.findMany({
      where: { orderId: testOrderId },
    });
    expect(earnings).toHaveLength(0);
  });
});
