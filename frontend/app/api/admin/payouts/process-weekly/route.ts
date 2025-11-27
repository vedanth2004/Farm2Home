/**
 * Admin endpoint to trigger weekly payout processing
 * Can be called manually or via cron job
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { processWeeklyPayouts } from "@/scripts/cron/weekly-payouts";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can trigger payout processing
    await requirePermission("write:payouts");

    const result = await processWeeklyPayouts();

    return NextResponse.json({
      message: "Weekly payout processing completed",
      ...result,
    });
  } catch (error) {
    console.error("Error processing weekly payouts:", error);
    return NextResponse.json(
      { error: "Failed to process weekly payouts" },
      { status: 500 },
    );
  }
}
