import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.ADMIN) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const pending = await prisma.farmerProfile.findMany({
    where: { verified: false },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ pending });
}
