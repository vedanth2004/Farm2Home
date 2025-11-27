/**
 * API-specific type definitions
 */

import { ApiResponse, PaginatedResponse } from "./index";

// ============================================================================
// API ENDPOINT TYPES
// ============================================================================

export interface CreateOrderRequest {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  totalAmount: number;
  shippingAddress: {
    address: string;
    city: string;
    pincode: string;
  };
}

export interface CreateOrderResponse
  extends ApiResponse<{
    orderId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    key: string;
  }> {}

export interface VerifyPaymentRequest {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse
  extends ApiResponse<{
    success: boolean;
    result: any;
    message: string;
  }> {}

export interface CreateProductRequest {
  name: string;
  category: string;
  description: string;
  baseUnit: string;
  photos: string[];
  farmerPrice: number;
  availableQty: number;
}

export interface CreateProductResponse
  extends ApiResponse<{
    productId: string;
    draftId: string;
  }> {}

export interface UpdateProductRequest {
  name?: string;
  category?: string;
  description?: string;
  baseUnit?: string;
  photos?: string[];
  farmerPrice?: number;
  availableQty?: number;
}

export interface ApproveProductRequest {
  storePrice: number;
  margin?: number;
  adminNote?: string;
}

export interface RejectProductRequest {
  reason: string;
  adminNote?: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  phone?: string;
  role: string;
  password?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface CreatePayoutRequest {
  farmerId: string;
  amount: number;
  reason?: string;
}

export interface ApprovePayoutRequest {
  payoutId: string;
}

export interface RejectPayoutRequest {
  payoutId: string;
  reason: string;
}

// ============================================================================
// ANALYTICS API TYPES
// ============================================================================

export interface AnalyticsRequest {
  startDate?: string;
  endDate?: string;
  groupBy?: "day" | "week" | "month";
}

export interface AnalyticsResponse
  extends ApiResponse<{
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
    recentOrders: any[];
    ordersByMonth: Array<{
      month: string;
      count: number;
      revenue: number;
    }>;
    revenueByMonth: Array<{
      month: string;
      revenue: number;
    }>;
    userRegistrationsByMonth: Array<{
      month: string;
      count: number;
    }>;
  }> {}

// ============================================================================
// CART API TYPES
// ============================================================================

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  itemId: string;
  quantity: number;
}

export interface RemoveFromCartRequest {
  itemId: string;
}

export interface CartResponse
  extends ApiResponse<{
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      price: number;
      quantity: number;
      unit: string;
      image: string | null;
      farmerName: string;
      availableStock: number;
    }>;
    total: number;
    itemCount: number;
  }> {}

// ============================================================================
// SEARCH & FILTER API TYPES
// ============================================================================

export interface SearchRequest {
  query: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    order: "asc" | "desc";
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface SearchResponse<T> extends PaginatedResponse<T> {
  filters: Record<string, any>;
  sort: {
    field: string;
    order: "asc" | "desc";
  };
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        status: string;
      };
    };
  };
}

export interface PaymentWebhookData {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  status: string;
}

// ============================================================================
// FILE UPLOAD TYPES
// ============================================================================

export interface FileUploadRequest {
  file: File;
  type: "product" | "profile" | "document";
}

export interface FileUploadResponse
  extends ApiResponse<{
    url: string;
    publicId: string;
    secureUrl: string;
  }> {}

// ============================================================================
// NOTIFICATION API TYPES
// ============================================================================

export interface SendNotificationRequest {
  userId: string;
  type: string;
  channel: "EMAIL" | "PUSH" | "INAPP";
  payload: Record<string, any>;
}

export interface NotificationResponse
  extends ApiResponse<{
    notificationId: string;
    sent: boolean;
    channel: string;
  }> {}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface ExportRequest {
  type: "orders" | "products" | "users" | "earnings";
  format: "csv" | "xlsx" | "pdf";
  filters?: Record<string, any>;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ExportResponse
  extends ApiResponse<{
    downloadUrl: string;
    filename: string;
    expiresAt: Date;
  }> {}
