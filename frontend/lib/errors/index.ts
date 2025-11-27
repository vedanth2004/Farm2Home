/**
 * Centralized error handling system for Farm2Home
 * Provides consistent error types, messages, and handling across the application
 */

// AppError is defined in this file, not imported

// ============================================================================
// ERROR CODES
// ============================================================================

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",

  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT = "INVALID_FORMAT",
  INVALID_VALUE = "INVALID_VALUE",

  // Database
  DATABASE_ERROR = "DATABASE_ERROR",
  RECORD_NOT_FOUND = "RECORD_NOT_FOUND",
  DUPLICATE_RECORD = "DUPLICATE_RECORD",
  CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION",

  // Business Logic
  INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK",
  ORDER_NOT_EDITABLE = "ORDER_NOT_EDITABLE",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PAYOUT_ALREADY_PENDING = "PAYOUT_ALREADY_PENDING",
  PRODUCT_NOT_APPROVED = "PRODUCT_NOT_APPROVED",

  // External Services
  PAYMENT_GATEWAY_ERROR = "PAYMENT_GATEWAY_ERROR",
  EMAIL_SERVICE_ERROR = "EMAIL_SERVICE_ERROR",
  FILE_UPLOAD_ERROR = "FILE_UPLOAD_ERROR",
  MAP_SERVICE_ERROR = "MAP_SERVICE_ERROR",

  // System
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
}

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ErrorMessages = {
  [ErrorCode.UNAUTHORIZED]: "Authentication required",
  [ErrorCode.FORBIDDEN]: "Access denied",
  [ErrorCode.INVALID_CREDENTIALS]: "Invalid email or password",
  [ErrorCode.SESSION_EXPIRED]: "Session expired",
  [ErrorCode.INSUFFICIENT_PERMISSIONS]:
    "Insufficient permissions for this action",

  [ErrorCode.VALIDATION_ERROR]: "Validation failed",
  [ErrorCode.MISSING_REQUIRED_FIELD]: "Required field is missing",
  [ErrorCode.INVALID_FORMAT]: "Invalid format",
  [ErrorCode.INVALID_VALUE]: "Invalid value provided",

  [ErrorCode.DATABASE_ERROR]: "Database operation failed",
  [ErrorCode.RECORD_NOT_FOUND]: "Record not found",
  [ErrorCode.DUPLICATE_RECORD]: "Record already exists",
  [ErrorCode.CONSTRAINT_VIOLATION]: "Database constraint violation",

  [ErrorCode.INSUFFICIENT_STOCK]: "Insufficient stock available",
  [ErrorCode.ORDER_NOT_EDITABLE]: "Order cannot be modified",
  [ErrorCode.PAYMENT_FAILED]: "Payment processing failed",
  [ErrorCode.PAYOUT_ALREADY_PENDING]: "Payout request already pending",
  [ErrorCode.PRODUCT_NOT_APPROVED]: "Product not approved for sale",

  [ErrorCode.PAYMENT_GATEWAY_ERROR]: "Payment gateway error",
  [ErrorCode.EMAIL_SERVICE_ERROR]: "Email service error",
  [ErrorCode.FILE_UPLOAD_ERROR]: "File upload failed",
  [ErrorCode.MAP_SERVICE_ERROR]: "Map service error",

  [ErrorCode.INTERNAL_SERVER_ERROR]: "Internal server error",
  [ErrorCode.SERVICE_UNAVAILABLE]: "Service temporarily unavailable",
  [ErrorCode.RATE_LIMIT_EXCEEDED]: "Rate limit exceeded",
} as const;

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message?: string,
    statusCode: number = 500,
    details?: Record<string, any>,
  ) {
    super(message || ErrorMessages[code]);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
  }
}

export class ValidationError extends AppError {
  public readonly validationErrors: ValidationError[];

  constructor(validationErrors: ValidationError[], message?: string) {
    super(ErrorCode.VALIDATION_ERROR, message || "Validation failed", 400, {
      validationErrors,
    });
    this.validationErrors = validationErrors;
  }
}

export class BusinessLogicError extends AppError {
  constructor(
    code: ErrorCode,
    message?: string,
    details?: Record<string, any>,
  ) {
    super(code, message, 400, details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message?: string,
    details?: Record<string, any>,
  ) {
    super(
      ErrorCode.PAYMENT_GATEWAY_ERROR, // Default to payment gateway error
      message || `${service} service error`,
      502,
      { service, ...details },
    );
  }
}

// ============================================================================
// ERROR FACTORY FUNCTIONS
// ============================================================================

export function createValidationError(
  field: string,
  message: string,
  value?: any,
): ValidationError {
  // Create a validation error object that matches the expected structure
  const validationErrorObj = {
    field,
    message,
    value,
  } as any;
  return new ValidationError([validationErrorObj]);
}

export function createNotFoundError(resource: string, id?: string): AppError {
  return new AppError(
    ErrorCode.RECORD_NOT_FOUND,
    `${resource} not found${id ? ` with ID: ${id}` : ""}`,
    404,
    { resource, id },
  );
}

export function createUnauthorizedError(message?: string): AppError {
  return new AppError(
    ErrorCode.UNAUTHORIZED,
    message || "Authentication required",
    401,
  );
}

export function createForbiddenError(message?: string): AppError {
  return new AppError(ErrorCode.FORBIDDEN, message || "Access denied", 403);
}

export function createBusinessLogicError(
  code: ErrorCode,
  message?: string,
  details?: Record<string, any>,
): BusinessLogicError {
  return new BusinessLogicError(code, message, details);
}

export function createExternalServiceError(
  service: string,
  message?: string,
  details?: Record<string, any>,
): ExternalServiceError {
  return new ExternalServiceError(service, message, details);
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}

export function isBusinessLogicError(error: any): error is BusinessLogicError {
  return error instanceof BusinessLogicError;
}

export function isExternalServiceError(
  error: any,
): error is ExternalServiceError {
  return error instanceof ExternalServiceError;
}

// ============================================================================
// ERROR RESPONSE FORMATTER
// ============================================================================

export function formatErrorResponse(error: any): {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: string;
} {
  if (isAppError(error)) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp: error.timestamp.toISOString(),
    };
  }

  // Handle unknown errors
  return {
    success: false,
    error: "An unexpected error occurred",
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// ERROR LOGGING
// ============================================================================

export function logError(error: any, context?: Record<string, any>): void {
  const errorInfo = {
    message: error.message,
    code: isAppError(error) ? error.code : "UNKNOWN",
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  // In production, you might want to send this to a logging service
  console.error("Application Error:", errorInfo);
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === "") {
    throw createValidationError(fieldName, `${fieldName} is required`);
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createValidationError("email", "Invalid email format");
  }
}

export function validatePhone(phone: string): void {
  const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
  if (!phoneRegex.test(phone)) {
    throw createValidationError("phone", "Invalid phone number format");
  }
}

export function validatePositiveNumber(value: number, fieldName: string): void {
  if (typeof value !== "number" || value <= 0) {
    throw createValidationError(
      fieldName,
      `${fieldName} must be a positive number`,
    );
  }
}

export function validateEnum<T>(
  value: any,
  enumObject: Record<string, T>,
  fieldName: string,
): void {
  if (!Object.values(enumObject).includes(value)) {
    throw createValidationError(
      fieldName,
      `${fieldName} must be one of: ${Object.values(enumObject).join(", ")}`,
    );
  }
}

// ============================================================================
// EXPORT ALL
// ============================================================================

// All error types and utilities are exported above
