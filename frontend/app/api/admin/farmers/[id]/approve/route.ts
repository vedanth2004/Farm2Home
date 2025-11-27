import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.ADMIN) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const farmerProfileId = params.id;

  const profile = await prisma.farmerProfile.update({
    where: { id: farmerProfileId },
    data: { verified: true },
  });

  return NextResponse.json({ success: true, profile });
}
