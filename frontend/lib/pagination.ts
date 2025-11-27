/**
 * Pagination Utilities
 * Standardizes pagination across all API endpoints
 */

import { NextRequest } from "next/server";

export interface PaginationParams {
  page?: number;
  limit?: number;
  skip?: number;
  take?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Parse pagination parameters from request
 */
export function parsePagination(
  request: NextRequest,
  defaultLimit: number = 20,
): PaginationParams {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(
    url.searchParams.get("limit") || String(defaultLimit),
    10,
  );

  return {
    page: Math.max(1, page),
    limit: Math.min(200, Math.max(1, limit)), // Cap at 200, minimum 1
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / pagination.limit!);
  const page = pagination.page || 1;

  return {
    data,
    pagination: {
      page,
      limit: pagination.limit!,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
