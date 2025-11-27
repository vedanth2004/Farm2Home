/**
 * String utility functions
 */

/**
 * Generate a random referral code (e.g., "FARM2HOME-A1B2C3")
 */
export function generateReferralCode(): string {
  const prefix = "FARM2HOME";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude similar-looking characters
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${prefix}-${code}`;
}

/**
 * Generate a random order code
 */
export function generateOrderCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}
