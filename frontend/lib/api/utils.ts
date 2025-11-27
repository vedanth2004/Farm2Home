/**
 * Centralized API utilities for Farm2Home
 * Provides common functions for API routes to eliminate code duplication
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AppError,
  ErrorCode,
  createUnauthorizedError,
  createForbiddenError,
  createNotFoundError,
  formatErrorResponse,
  logError,
} from "@/lib/errors";
import { UserRole } from "@/lib/types";

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================

/**
 * Get the current user session with error handling
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw createUnauthorizedError("Authentication required");
    }

    return session.user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createUnauthorizedError("Invalid session");
  }
}

/**
 * Check if user has required role
 */
export function requireRole(userRole: UserRole, requiredRole: UserRole): void {
  const roleHierarchy: Record<UserRole, number> = {
    ADMIN: 5,
    FARMER: 4,
    CR: 3,
    PICKUP_AGENT: 2,
    CUSTOMER: 1,
  };

  if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
    throw createForbiddenError(
      `Insufficient permissions. Required: ${requiredRole}`,
    );
  }
}

/**
 * Check if user is admin
 */
export function requireAdmin(userRole: UserRole): void {
  if (userRole !== "ADMIN") {
    throw createForbiddenError("Admin access required");
  }
}

/**
 * Check if user is farmer
 */
export function requireFarmer(userRole: UserRole): void {
  if (userRole !== "FARMER") {
    throw createForbiddenError("Farmer access required");
  }
}

/**
 * Check if user is customer
 */
export function requireCustomer(userRole: UserRole): void {
  if (userRole !== "CUSTOMER") {
    throw createForbiddenError("Customer access required");
  }
}

// ============================================================================
// REQUEST VALIDATION UTILITIES
// ============================================================================

/**
 * Parse and validate JSON request body
 */
export async function parseRequestBody<T = any>(
  request: NextRequest,
): Promise<T> {
  try {
    const body = await request.json();
    return body;
  } catch (error) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      "Invalid JSON in request body",
      400,
    );
  }
}

/**
 * Get query parameters from request
 */
export function getQueryParams(request: NextRequest): Record<string, string> {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[],
): void {
  const missingFields = requiredFields.filter(
    (field) =>
      body[field] === undefined || body[field] === null || body[field] === "",
  );

  if (missingFields.length > 0) {
    throw new AppError(
      ErrorCode.MISSING_REQUIRED_FIELD,
      `Missing required fields: ${missingFields.join(", ")}`,
      400,
      { missingFields },
    );
  }
}

// ============================================================================
// DATABASE UTILITIES
// ============================================================================

/**
 * Find a record by ID with error handling
 */
export async function findRecordById<T>(
  model: any,
  id: string,
  resourceName: string,
  include?: any,
): Promise<T> {
  try {
    const record = await model.findUnique({
      where: { id },
      include,
    });

    if (!record) {
      throw createNotFoundError(resourceName, id);
    }

    return record;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      ErrorCode.DATABASE_ERROR,
      `Failed to fetch ${resourceName}`,
      500,
    );
  }
}

/**
 * Create a record with error handling
 */
export async function createRecord<T>(
  model: any,
  data: any,
  resourceName: string,
): Promise<T> {
  try {
    return await model.create({ data });
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new AppError(
        ErrorCode.DUPLICATE_RECORD,
        `${resourceName} already exists`,
        409,
      );
    }
    throw new AppError(
      ErrorCode.DATABASE_ERROR,
      `Failed to create ${resourceName}`,
      500,
    );
  }
}

/**
 * Update a record with error handling
 */
export async function updateRecord<T>(
  model: any,
  id: string,
  data: any,
  resourceName: string,
): Promise<T> {
  try {
    const record = await model.update({
      where: { id },
      data,
    });

    if (!record) {
      throw createNotFoundError(resourceName, id);
    }

    return record;
  } catch (error: any) {
    if (error.code === "P2025") {
      throw createNotFoundError(resourceName, id);
    }
    throw new AppError(
      ErrorCode.DATABASE_ERROR,
      `Failed to update ${resourceName}`,
      500,
    );
  }
}

/**
 * Delete a record with error handling
 */
export async function deleteRecord(
  model: any,
  id: string,
  resourceName: string,
): Promise<void> {
  try {
    await model.delete({ where: { id } });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw createNotFoundError(resourceName, id);
    }
    if (error.code === "P2003") {
      throw new AppError(
        ErrorCode.CONSTRAINT_VIOLATION,
        `Cannot delete ${resourceName} with related records`,
        400,
      );
    }
    throw new AppError(
      ErrorCode.DATABASE_ERROR,
      `Failed to delete ${resourceName}`,
      500,
    );
  }
}

// ============================================================================
// RESPONSE UTILITIES
// ============================================================================

/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200,
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status },
  );
}

/**
 * Create an error response
 */
export function createErrorResponse(error: any, status?: number): NextResponse {
  const errorResponse = formatErrorResponse(error);
  const responseStatus =
    status || (error instanceof AppError ? error.statusCode : 500);

  logError(error);

  return NextResponse.json(errorResponse, { status: responseStatus });
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): NextResponse {
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError(ErrorCode.INVALID_FORMAT, "Invalid email format", 400);
  }
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): void {
  const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
  if (!phoneRegex.test(phone)) {
    throw new AppError(
      ErrorCode.INVALID_FORMAT,
      "Invalid phone number format",
      400,
    );
  }
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: number, fieldName: string): void {
  if (typeof value !== "number" || value <= 0) {
    throw new AppError(
      ErrorCode.INVALID_VALUE,
      `${fieldName} must be a positive number`,
      400,
    );
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T>(
  value: any,
  enumObject: Record<string, T>,
  fieldName: string,
): void {
  if (!Object.values(enumObject).includes(value)) {
    throw new AppError(
      ErrorCode.INVALID_VALUE,
      `${fieldName} must be one of: ${Object.values(enumObject).join(", ")}`,
      400,
    );
  }
}

// ============================================================================
// BUSINESS LOGIC UTILITIES
// ============================================================================

/**
 * Check if user can access resource
 */
export function canAccessResource(
  userRole: UserRole,
  resourceOwnerId: string,
  currentUserId: string,
): boolean {
  // Admin can access everything
  if (userRole === "ADMIN") {
    return true;
  }

  // Users can only access their own resources
  return resourceOwnerId === currentUserId;
}

/**
 * Check if order can be modified
 */
export function canModifyOrder(orderStatus: string): boolean {
  const modifiableStatuses = ["CREATED", "PAID"];
  return modifiableStatuses.includes(orderStatus);
}

/**
 * Check if product can be deleted
 */
export async function canDeleteProduct(productId: string): Promise<boolean> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        listings: {
          include: {
            orderItems: true,
          },
        },
      },
    });

    if (!product) {
      return false;
    }

    // Check if product has any orders
    const hasOrders = product.listings.some(
      (listing) => listing.orderItems.length > 0,
    );

    return !hasOrders;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// PAGINATION UTILITIES
// ============================================================================

/**
 * Parse pagination parameters
 */
export function parsePaginationParams(request: NextRequest): {
  page: number;
  limit: number;
  skip: number;
} {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "10")),
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Create pagination metadata
 */
export function createPaginationMetadata(
  page: number,
  limit: number,
  total: number,
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

// ============================================================================
// SORTING UTILITIES
// ============================================================================

/**
 * Parse sort parameters
 */
export function parseSortParams(request: NextRequest): {
  orderBy: Record<string, "asc" | "desc">;
} {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  return {
    orderBy: {
      [sortBy]: sortOrder as "asc" | "desc",
    },
  };
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

// All utilities are exported above
