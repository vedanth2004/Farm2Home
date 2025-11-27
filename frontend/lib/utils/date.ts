/**
 * Date formatting utilities to prevent hydration mismatches
 * Always use these functions instead of native toLocaleDateString/toLocaleString
 */

/**
 * Format a date string to a consistent format
 * Uses en-US locale to ensure server and client match
 */
export function formatDate(
  dateString: string | Date,
  options?: {
    year?: "numeric" | "2-digit";
    month?: "numeric" | "2-digit" | "long" | "short" | "narrow";
    day?: "numeric" | "2-digit";
    hour?: "2-digit" | "numeric";
    minute?: "2-digit" | "numeric";
    second?: "2-digit" | "numeric";
  },
): string {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...options,
  };

  return new Intl.DateTimeFormat("en-US", defaultOptions).format(date);
}

/**
 * Format a date to date-only string (MM/DD/YYYY)
 */
export function formatDateOnly(dateString: string | Date): string {
  return formatDate(dateString, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Format a date to date and time string
 */
export function formatDateTime(dateString: string | Date): string {
  return formatDate(dateString, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a date to a short date string (MMM DD, YYYY)
 */
export function formatShortDate(dateString: string | Date): string {
  return formatDate(dateString, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date to a readable string with time
 */
export function formatDateTimeLong(dateString: string | Date): string {
  return formatDate(dateString, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
