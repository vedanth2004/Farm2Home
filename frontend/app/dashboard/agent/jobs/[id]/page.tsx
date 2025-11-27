import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PickupJobDetailsClient from "@/components/agent/PickupJobDetailsClient";
import Link from "next/link";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Navigation,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getPickupJob(jobId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    // Get agent profile
    const agentProfile = await prisma.pickupAgentProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!agentProfile) return null;

    // Get pickup job
    const pickupJob = await prisma.pickupJob.findFirst({
      where: {
        id: jobId,
        agentId: agentProfile.id,
      },
      include: {
        order: {
          include: {
            customer: true,
            shippingAddress: true,
            items: {
              include: {
                listing: {
                  include: {
                    product: {
                      include: {
                        farmer: {
                          include: {
                            user: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return pickupJob;
  } catch (error) {
    console.error("Error fetching pickup job:", error);
    return null;
  }
}

export default async function PickupJobDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePermission("read:pickup");

  const pickupJob = await getPickupJob(params.id);

  if (!pickupJob) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/agent/jobs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Job Not Found</h1>
            <p className="text-gray-600">
              The requested pickup job could not be found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard/agent/jobs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Pickup Job Details
          </h1>
          <p className="text-gray-600">Manage and track pickup job progress</p>
        </div>
      </div>

      {/* Client Component */}
      <PickupJobDetailsClient
        pickupJob={{
          id: pickupJob.id,
          status: pickupJob.status,
          createdAt: pickupJob.createdAt.toISOString(),
          order: {
            id: pickupJob.order.id,
            status: pickupJob.order.status,
            paymentStatus: pickupJob.order.paymentStatus,
            totalAmount: Number(pickupJob.order.totalAmount),
            createdAt: pickupJob.order.createdAt.toISOString(),
            customer: pickupJob.order.customer
              ? {
                  name: pickupJob.order.customer.name,
                  email: pickupJob.order.customer.email,
                  phone: pickupJob.order.customer.phone || undefined,
                }
              : undefined,
            shippingAddress: {
              line1: pickupJob.order.shippingAddress.line1,
              city: pickupJob.order.shippingAddress.city,
              postalCode: pickupJob.order.shippingAddress.postalCode,
            },
            items: pickupJob.order.items.map((item) => ({
              id: item.id,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
              listing: {
                product: {
                  name: item.listing.product.name,
                  description: item.listing.product.description,
                  farmer: {
                    user: {
                      name: item.listing.product.farmer.user.name,
                    },
                  },
                },
              },
            })),
          },
        }}
      />
    </div>
  );
}
