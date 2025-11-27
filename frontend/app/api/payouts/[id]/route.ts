import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payoutId = params.id;
    const { status, reference } = await request.json();

    if (!status || !["PENDING", "SCHEDULED", "PAID"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const payout = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status,
        reference: reference || null,
        updatedAt: new Date(),
      },
    });

    // If marking as PAID and it's a farmer payout, update earnings status
    if (
      status === "PAID" &&
      payout.beneficiaryType === "FARMER" &&
      (payout as any).farmerId
    ) {
      await (prisma as any).earnings.updateMany({
        where: {
          farmerId: (payout as any).farmerId,
          status: "PENDING",
        },
        data: {
          status: "PAID",
        },
      });
    }

    return NextResponse.json(payout);
  } catch (error) {
    console.error("Error updating payout:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payoutId = params.id;

    await prisma.payout.delete({
      where: { id: payoutId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payout:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
