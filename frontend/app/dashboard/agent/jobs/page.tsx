import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PickupJobsList from "@/components/agent/PickupJobsList";
import Link from "next/link";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  ArrowLeft,
  Eye,
  Navigation,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { serializePrismaData } from "@/lib/serialization";

async function getPickupJobs() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    // Get agent profile
    const agentProfile = await prisma.pickupAgentProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!agentProfile) return [];

    // Get pickup jobs for this agent
    const pickupJobs = await prisma.pickupJob.findMany({
      where: { agentId: agentProfile.id },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return pickupJobs;
  } catch (error) {
    console.error("Error fetching pickup jobs:", error);
    return [];
  }
}

export default async function PickupJobsPage() {
  await requirePermission("read:pickup");

  const pickupJobs = await getPickupJobs();
  const serializedJobs = serializePrismaData(pickupJobs) as any;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/agent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pickup Jobs</h1>
            <p className="text-gray-600">
              Manage and track your pickup assignments
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Jobs</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search by order ID or customer..."
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Filter by Status</Label>
              <select
                id="status"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="REQUESTED">Requested</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="HANDED_TO_CR">Handed to CR</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <Label htmlFor="date">Filter by Date</Label>
              <Input id="date" type="date" className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {pickupJobs.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Pickup Jobs
          </h3>
          <p className="text-gray-600 mb-6">
            You don&apos;t have any pickup jobs assigned yet.
          </p>
        </div>
      ) : (
        <PickupJobsList pickupJobs={serializedJobs} />
      )}
    </div>
  );
}
