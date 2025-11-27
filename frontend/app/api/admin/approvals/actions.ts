/**
 * Server Actions for Approvals
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function approveUser(requestId: string, adminNotes?: string) {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/admin/approvals`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status: "APPROVED",
          adminNotes,
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to approve user");
    }

    revalidatePath("/dashboard/admin/approvals");
    return { success: true };
  } catch (error) {
    console.error("Error approving user:", error);
    return { success: false, error: "Failed to approve user" };
  }
}

export async function rejectUser(requestId: string, adminNotes?: string) {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/admin/approvals`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status: "REJECTED",
          adminNotes,
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to reject user");
    }

    revalidatePath("/dashboard/admin/approvals");
    return { success: true };
  } catch (error) {
    console.error("Error rejecting user:", error);
    return { success: false, error: "Failed to reject user" };
  }
}
