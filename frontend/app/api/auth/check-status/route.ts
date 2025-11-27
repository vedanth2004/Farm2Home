import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccountStatus } from "@prisma/client";

/**
 * GET /api/auth/check-status?email=...
 * Check account status for a given email (used for login error messages)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        accountStatus: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: user.accountStatus,
      role: user.role,
    });
  } catch (error) {
    console.error("Error checking account status:", error);
    return NextResponse.json(
      { error: "Failed to check account status" },
      { status: 500 },
    );
  }
}
