import {
  PrismaClient,
  UserRole,
  ProductDraftStatus,
  OrderStatus,
  PaymentStatus,
  AccountStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create users
  const admin = await prisma.user.upsert({
    where: { email: "admin@farm2home.com" },
    update: {
      accountStatus: AccountStatus.APPROVED,
    },
    create: {
      email: "admin@farm2home.com",
      name: "Admin User",
      role: UserRole.ADMIN,
      password: await bcrypt.hash("admin123", 10),
      accountStatus: AccountStatus.APPROVED,
    },
  });

  const farmer1 = await prisma.user.upsert({
    where: { email: "farmer@farm2home.com" },
    update: {
      accountStatus: AccountStatus.APPROVED,
    },
    create: {
      email: "farmer@farm2home.com",
      name: "John Farmer",
      role: UserRole.FARMER,
      password: await bcrypt.hash("farmer123", 10),
      accountStatus: AccountStatus.APPROVED,
    },
  });

  const farmer2 = await prisma.user.upsert({
    where: { email: "farmer2@farm2home.com" },
    update: {
      accountStatus: AccountStatus.APPROVED,
    },
    create: {
      email: "farmer2@farm2home.com",
      name: "Jane Farmer",
      role: UserRole.FARMER,
      password: await bcrypt.hash("farmer123", 10),
      accountStatus: AccountStatus.APPROVED,
    },
  });

  const cr = await prisma.user.upsert({
    where: { email: "cr@farm2home.com" },
    update: {
      accountStatus: AccountStatus.APPROVED,
    },
    create: {
      email: "cr@farm2home.com",
      name: "Community Rep",
      role: UserRole.CR,
      password: await bcrypt.hash("cr123", 10),
      accountStatus: AccountStatus.APPROVED,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: "agent@farm2home.com" },
    update: {
      accountStatus: AccountStatus.APPROVED,
    },
    create: {
      email: "agent@farm2home.com",
      name: "Pickup Agent",
      role: UserRole.PICKUP_AGENT,
      password: await bcrypt.hash("agent123", 10),
      accountStatus: AccountStatus.APPROVED,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@farm2home.com" },
    update: {
      accountStatus: AccountStatus.APPROVED,
    },
    create: {
      email: "customer@farm2home.com",
      name: "Customer User",
      role: UserRole.CUSTOMER,
      password: await bcrypt.hash("customer123", 10),
      accountStatus: AccountStatus.APPROVED,
    },
  });

  // Create profiles
  const farmerProfile1 = await prisma.farmerProfile.upsert({
    where: { userId: farmer1.id },
    update: {},
    create: {
      userId: farmer1.id,
      govtId: "FARMER001",
      upiId: "farmer1@upi",
      verified: true,
    },
  });

  const farmerProfile2 = await prisma.farmerProfile.upsert({
    where: { userId: farmer2.id },
    update: {},
    create: {
      userId: farmer2.id,
      govtId: "FARMER002",
      upiId: "farmer2@upi",
      verified: true,
    },
  });

  const crProfile = await prisma.cRProfile.upsert({
    where: { userId: cr.id },
    update: {},
    create: {
      userId: cr.id,
      serviceAreas: ["Bangalore", "Whitefield", "Electronic City"],
    },
  });

  const agentProfile = await prisma.pickupAgentProfile.upsert({
    where: { userId: agent.id },
    update: {},
    create: {
      userId: agent.id,
      vehicleType: "Two Wheeler",
      serviceAreas: ["Bangalore", "Whitefield"],
    },
  });

  // Create products
  const product1 = await prisma.product.create({
    data: {
      farmerId: farmerProfile1.id,
      name: "Organic Tomatoes",
      category: "Vegetables",
      description: "Fresh organic tomatoes grown without pesticides",
      baseUnit: "kg",
      photos: [
        "https://images.unsplash.com/photo-1546470427-e26264be0d40?w=400",
      ],
    },
  });

  const product2 = await prisma.product.create({
    data: {
      farmerId: farmerProfile1.id,
      name: "Fresh Spinach",
      category: "Leafy Greens",
      description: "Fresh spinach leaves, perfect for salads",
      baseUnit: "bunch",
      photos: [
        "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400",
      ],
    },
  });

  const product3 = await prisma.product.create({
    data: {
      farmerId: farmerProfile2.id,
      name: "Organic Carrots",
      category: "Vegetables",
      description: "Sweet organic carrots, great for cooking",
      baseUnit: "kg",
      photos: [
        "https://images.unsplash.com/photo-1598170845058-83b8cb5cc293?w=400",
      ],
    },
  });

  // Create product drafts
  const draft1 = await prisma.productDraft.create({
    data: {
      productId: product1.id,
      pricePerUnit: 80.0,
      availableQty: 50,
      status: ProductDraftStatus.PENDING,
    },
  });

  const draft2 = await prisma.productDraft.create({
    data: {
      productId: product2.id,
      pricePerUnit: 25.0,
      availableQty: 30,
      status: ProductDraftStatus.APPROVED,
    },
  });

  const draft3 = await prisma.productDraft.create({
    data: {
      productId: product3.id,
      pricePerUnit: 60.0,
      availableQty: 40,
      status: ProductDraftStatus.APPROVED,
    },
  });

  // Create approved listings
  const listing1 = await prisma.productListing.create({
    data: {
      productId: product2.id,
      pricePerUnit: 25.0,
      availableQty: 30,
      isActive: true,
      approvedBy: admin.id,
      approvedAt: new Date(),
    },
  });

  const listing2 = await prisma.productListing.create({
    data: {
      productId: product3.id,
      pricePerUnit: 60.0,
      availableQty: 40,
      isActive: true,
      approvedBy: admin.id,
      approvedAt: new Date(),
    },
  });

  // Create addresses
  const address = await prisma.address.create({
    data: {
      userId: customer.id,
      label: "Home",
      line1: "123 Main Street",
      city: "Bangalore",
      state: "Karnataka",
      postalCode: "560001",
      country: "India",
      lat: 12.9716,
      lon: 77.5946,
    },
  });

  // Create an order
  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      status: OrderStatus.PAID,
      totalAmount: 85.0,
      paymentStatus: PaymentStatus.SUCCESS,
      shippingAddressId: address.id,
    },
  });

  // Create order items
  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      listingId: listing1.id,
      quantity: 2,
      unitPrice: 25.0,
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      listingId: listing2.id,
      quantity: 1,
      unitPrice: 60.0,
    },
  });

  // Create payment
  await prisma.payment.create({
    data: {
      orderId: order.id,
      gateway: "RAZORPAY",
      gatewayOrderId: "order_test123",
      gatewayPaymentId: "pay_test123",
      status: PaymentStatus.SUCCESS,
      amount: 85.0,
    },
  });

  // Create pickup job
  await prisma.pickupJob.create({
    data: {
      orderId: order.id,
      agentId: agentProfile.id,
      status: "REQUESTED",
    },
  });

  // Create delivery
  await prisma.delivery.create({
    data: {
      orderId: order.id,
      crId: crProfile.id,
      status: "QUEUED",
    },
  });

  // Create inventory transactions
  await prisma.inventoryTransaction.create({
    data: {
      listingId: listing1.id,
      delta: -2,
      reason: "ORDER_RESERVE",
    },
  });

  await prisma.inventoryTransaction.create({
    data: {
      listingId: listing2.id,
      delta: -1,
      reason: "ORDER_RESERVE",
    },
  });

  // Create payouts
  await prisma.payout.create({
    data: {
      beneficiaryType: "FARMER",
      beneficiaryId: farmerProfile1.id,
      amount: 50.0,
      status: "PENDING",
    },
  });

  await prisma.payout.create({
    data: {
      beneficiaryType: "CR",
      beneficiaryId: crProfile.id,
      amount: 5.0,
      status: "PENDING",
    },
  });

  await prisma.payout.create({
    data: {
      beneficiaryType: "PICKUP_AGENT",
      beneficiaryId: agentProfile.id,
      amount: 10.0,
      status: "PENDING",
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log("📧 Demo accounts created:");
  console.log("   Admin: admin@farm2home.com / admin123");
  console.log("   Farmer: farmer@farm2home.com / farmer123");
  console.log("   CR: cr@farm2home.com / cr123");
  console.log("   Agent: agent@farm2home.com / agent123");
  console.log("   Customer: customer@farm2home.com / customer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
