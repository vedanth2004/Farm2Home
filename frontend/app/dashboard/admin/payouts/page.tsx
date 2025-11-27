import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import PayoutManagement from "@/components/admin/PayoutManagement";

async function getPayouts() {
  try {
    const payouts = await prisma.payout.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Get beneficiary details for each payout
    const payoutsWithDetails = await Promise.all(
      payouts.map(async (payout) => {
        let beneficiaryName = "Unknown";
        let beneficiaryEmail = "";

        try {
          switch (payout.beneficiaryType) {
            case "FARMER":
              const farmer = await prisma.farmerProfile.findUnique({
                where: { id: payout.beneficiaryId },
                include: { user: true },
              });
              if (farmer) {
                beneficiaryName = farmer.user.name;
                beneficiaryEmail = farmer.user.email;
              }
              break;

            case "CR":
              const cr = await prisma.cRProfile.findUnique({
                where: { id: payout.beneficiaryId },
                include: { user: true },
              });
              if (cr) {
                beneficiaryName = cr.user.name;
                beneficiaryEmail = cr.user.email;
              }
              break;

            case "PICKUP_AGENT":
              const agent = await prisma.pickupAgentProfile.findUnique({
                where: { id: payout.beneficiaryId },
                include: { user: true },
              });
              if (agent) {
                beneficiaryName = agent.user.name;
                beneficiaryEmail = agent.user.email;
              }
              break;
          }
        } catch (error) {
          console.error("Error fetching beneficiary details:", error);
        }

        return {
          ...payout,
          amount: Number(payout.amount),
          beneficiaryName,
          beneficiaryEmail,
          createdAt: payout.createdAt.toISOString(),
          updatedAt: payout.updatedAt.toISOString(),
          reference: payout.reference || undefined,
          requestType: (payout as any).requestType || "MANUAL",
          farmerId: (payout as any).farmerId || undefined,
          requestedAt: (payout as any).requestedAt?.toISOString() || undefined,
          approvedAt: (payout as any).approvedAt?.toISOString() || undefined,
          rejectedAt: (payout as any).rejectedAt?.toISOString() || undefined,
        };
      }),
    );

    return payoutsWithDetails;
  } catch (error) {
    console.error("Error fetching payouts:", error);
    return [];
  }
}

export default async function AdminPayoutsPage() {
  await requirePermission("read:payouts");

  const payouts = await getPayouts();

  return (
    <div className="space-y-6">
      <PayoutManagement initialPayouts={payouts} />
    </div>
  );
}
