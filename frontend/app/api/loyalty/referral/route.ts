/**
 * Referral Code API
 * GET: Get user's referral code
 * POST: Apply a referral code during signup
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getOrCreateReferralCode, applyReferralCode } from "@/lib/loyalty";
import { getAppBaseUrl } from "@/lib/runtime-env";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("read:products");

    const referralCode = await getOrCreateReferralCode(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        referralCode,
        referralLink: `${getAppBaseUrl()}/signup?ref=${referralCode}`,
      },
    });
  } catch (error) {
    console.error("Error fetching referral code:", error);
    return NextResponse.json(
      { error: "Failed to fetch referral code" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("read:products");

    const { referralCode } = await request.json();

    if (!referralCode) {
      return NextResponse.json(
        { error: "Referral code is required" },
        { status: 400 },
      );
    }

    const result = await applyReferralCode(session.user.id, referralCode);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error applying referral code:", error);
    return NextResponse.json(
      { error: "Failed to apply referral code" },
      { status: 500 },
    );
  }
}
