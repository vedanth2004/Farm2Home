import { prisma } from "@/lib/prisma";
import { AccountStatus } from "@prisma/client";

/**
 * Get user account status and return appropriate error message
 */
export async function getAccountStatusError(
  email: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { accountStatus: true },
  });

  if (!user) {
    return null; // User not found - handled by auth
  }

  switch (user.accountStatus) {
    case AccountStatus.PENDING_VERIFICATION:
      return "Your account is under admin verification. Please wait for approval.";
    case AccountStatus.REJECTED:
      return "Your registration was rejected by admin. Please contact admin for clarification.";
    case AccountStatus.APPROVED:
      return null; // No error, account is approved
    default:
      return "Account status unknown. Please contact support.";
  }
}
