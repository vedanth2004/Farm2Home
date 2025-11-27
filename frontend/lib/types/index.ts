/**
 * Centralized type definitions for Farm2Home application
 * This file consolidates all shared types to eliminate duplication
 * and ensure consistency across the application.
 */

// ============================================================================
// USER & AUTHENTICATION TYPES
// ============================================================================

export type UserRole = "ADMIN" | "FARMER" | "CR" | "CUSTOMER" | "PICKUP_AGENT";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  twoFactorEnabled: boolean;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FarmerProfile {
  id: string;
  userId: string;
  govtId?: string;
  upiId?: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export type ProductDraftStatus =
  | "PENDING"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED";

export interface Product {
  id: string;
  farmerId: string;
  name: string;
  category: string;
  description: string;
  baseUnit: string;
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
  farmer?: FarmerProfile;
  listings?: ProductListing[];
  drafts?: ProductDraft[];
}

export interface ProductDraft {
  id: string;
  productId: string;
  pricePerUnit: number;
  farmerPrice?: number;
  storePrice?: number;
  availableQty: number;
  status: ProductDraftStatus;
  adminNote?: string;
  margin?: number;
  createdAt: Date;
  updatedAt: Date;
  product?: Product;
}

export interface ProductListing {
  id: string;
  productId: string;
  pricePerUnit: number;
  farmerPrice?: number;
  storePrice?: number;
  availableQty: number;
  isActive: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  margin?: number;
  createdAt: Date;
  updatedAt: Date;
  product?: Product;
  approver?: User;
}

// ============================================================================
// ORDER TYPES
// ============================================================================

export type OrderStatus =
  | "CREATED"
  | "PAID"
  | "PICKUP_ASSIGNED"
  | "PICKED_UP"
  | "AT_CR"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "REFUND_REQUESTED"
  | "REFUNDED";

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  shippingAddressId: string;
  createdAt: Date;
  updatedAt: Date;
  customer?: User;
  shippingAddress?: Address;
  items?: OrderItem[];
  payments?: Payment[];
  pickupJob?: PickupJob;
  earnings?: Earnings[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  listingId: string;
  quantity: number;
  unitPrice: number; // Store price (what customer paid)
  farmerPrice?: number; // Farmer's price (what farmer gets)
  platformFee?: number; // Platform margin (unitPrice - farmerPrice)
  listing?: ProductListing;
  order?: Order;
  earnings?: Earnings[];
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export type PaymentGateway = "RAZORPAY";

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  gateway: PaymentGateway;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  order?: Order;
}

// ============================================================================
// EARNINGS & PAYOUT TYPES
// ============================================================================

export type PayoutStatus = "PENDING" | "SCHEDULED" | "PAID" | "REJECTED";
export type BeneficiaryType = "FARMER" | "CR" | "PICKUP_AGENT";
export type PayoutRequestType = "MANUAL" | "FARMER_REQUEST" | "AUTO";
export type EarningsStatus = "PENDING" | "PAID" | "CANCELLED";

export interface Earnings {
  id: string;
  farmerId: string;
  orderId: string;
  orderItemId: string;
  amount: number;
  status: EarningsStatus;
  createdAt: Date;
  updatedAt: Date;
  farmer?: FarmerProfile;
  order?: Order;
  orderItem?: OrderItem;
}

export interface Payout {
  id: string;
  beneficiaryType: BeneficiaryType;
  beneficiaryId: string;
  amount: number;
  status: PayoutStatus;
  reference?: string;
  requestType: PayoutRequestType;
  farmerId?: string;
  requestedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  farmer?: FarmerProfile;
}

// ============================================================================
// ADDRESS TYPES
// ============================================================================

export interface Address {
  id: string;
  userId: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

// ============================================================================
// CART TYPES
// ============================================================================

export interface Cart {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  items?: CartItem[];
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  cart?: Cart;
  product?: Product;
}

// ============================================================================
// DASHBOARD METRICS TYPES
// ============================================================================

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  activeFarmers: number;
  pendingEarnings: number;
  lastUpdated: string;
}

export interface FarmerMetrics {
  pendingEarnings: number;
  totalEarnings: number;
  activeProducts: number;
  pendingOrders: number;
  thisMonthRevenue: number;
  lastUpdated: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface ProductFormData {
  name: string;
  category: string;
  description: string;
  baseUnit: string;
  photos: string[];
  farmerPrice: number;
  availableQty: number;
}

export interface OrderFormData {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress: {
    address: string;
    city: string;
    pincode: string;
  };
}

// ============================================================================
// FILTER & SEARCH TYPES
// ============================================================================

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  farmerId?: string;
  isActive?: boolean;
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface UserFilters {
  role?: UserRole;
  verified?: boolean;
  search?: string;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationChannel = "EMAIL" | "PUSH" | "INAPP";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  channel: NotificationChannel;
  payload: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

// ============================================================================
// PICKUP & DELIVERY TYPES
// ============================================================================

export type PickupJobStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "HANDED_TO_CR"
  | "DELIVERY_REQUESTED"
  | "DELIVERED"
  | "CANCELLED";

export type DeliveryStatus =
  | "QUEUED"
  | "RECEIVED_FROM_AGENT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED";

export interface PickupJob {
  id: string;
  orderId: string;
  agentId: string;
  status: PickupJobStatus;
  pickupEta?: Date;
  dropoffEta?: Date;
  createdAt: Date;
  updatedAt: Date;
  agent?: any; // PickupAgentProfile
  order?: Order;
}

export interface Delivery {
  id: string;
  orderId: string;
  crId: string;
  status: DeliveryStatus;
  deliveryEta?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  cr?: any; // CRProfile
  order?: Order;
}

// ============================================================================
// INVENTORY TYPES
// ============================================================================

export type InventoryTransactionReason =
  | "ORDER_RESERVE"
  | "ORDER_CANCEL"
  | "ADMIN_ADJUST"
  | "RESTOCK";

export interface InventoryTransaction {
  id: string;
  listingId: string;
  delta: number;
  reason: InventoryTransactionReason;
  createdAt: Date;
  listing?: ProductListing;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type SortOrder = "asc" | "desc";

export interface SortConfig {
  field: string;
  order: SortOrder;
}

export interface PaginationConfig {
  page: number;
  limit: number;
}

export interface SearchConfig {
  query: string;
  fields: string[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================
// Note: AppError and ValidationError are now defined in @/lib/errors
// This interface is kept for backward compatibility but should use the class from errors/index.ts
// export interface AppError {
//   code: string;
//   message: string;
//   details?: Record<string, any>;
//   timestamp: Date;
// }

// ValidationError is now defined as a class in @/lib/errors
// This interface is kept for backward compatibility but should use the class from errors/index.ts
// export interface ValidationError {
//   field: string;
//   message: string;
//   value?: any;
// }

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface AppConfig {
  database: {
    url: string;
  };
  auth: {
    secret: string;
    url: string;
  };
  payments: {
    razorpay: {
      keyId: string;
      keySecret: string;
      webhookSecret: string;
    };
  };
  email: {
    resendApiKey: string;
  };
  storage: {
    cloudinary: {
      cloudName: string;
      apiKey: string;
      apiSecret: string;
    };
  };
  cache: {
    redisUrl: string;
  };
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

// All types are exported above
