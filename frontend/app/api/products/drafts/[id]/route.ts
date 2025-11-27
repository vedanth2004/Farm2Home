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

    const draftId = params.id;
    const { storePrice, margin } = await request.json();

    if (!storePrice || storePrice <= 0) {
      return NextResponse.json(
        { error: "Store price must be greater than 0" },
        { status: 400 },
      );
    }

    const draft = await prisma.productDraft.update({
      where: { id: draftId },
      data: {
        storePrice: storePrice,
        margin: margin || 0,
      } as any, // Temporary type assertion until Prisma client is regenerated
    });

    return NextResponse.json({ success: true, draft });
  } catch (error) {
    console.error("Error updating product draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
