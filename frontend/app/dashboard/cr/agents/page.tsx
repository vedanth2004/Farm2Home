import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { createCRAgentFilter } from "@/lib/cr-utils";
import {
  Truck,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Filter,
  Search,
  Eye,
  MessageCircle,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Car,
  Bike,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getCRAgents() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CR") {
    return [];
  }

  const crProfile = await prisma.cRProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });

  if (!crProfile) return [];

  // Get pickup agents in CR's service areas using proper filtering
  const agentFilter = createCRAgentFilter(crProfile);
  const agents = await prisma.user.findMany({
    where: agentFilter,
    include: {
      pickupAgentProfile: {
        include: {
          pickupJobs: {
            include: {
              order: {
                include: {
                  customer: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      addresses: true,
    },
  });

  return agents as any;
}

export default async function CRAgentsPage() {
  await requirePermission("read:users");

  const agents = await getCRAgents();
  // Helper to get pickupJobs for an agent
  const getAgentPickupJobs = (agent: any) =>
    agent.pickupAgentProfile?.pickupJobs || [];

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "BUSY":
        return "bg-yellow-100 text-yellow-800";
      case "OFFLINE":
        return "bg-gray-100 text-gray-800";
      case "SUSPENDED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType?.toLowerCase()) {
      case "car":
        return <Car className="h-4 w-4" />;
      case "motorcycle":
        return <Bike className="h-4 w-4" />;
      case "bike":
        return <Bike className="h-4 w-4" />;
      default:
        return <Truck className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Pickup Agents in Your Service Areas
          </h1>
          <p className="text-gray-600 mt-1">
            View and manage pickup agents operating in your assigned service
            areas
          </p>
          <p className="text-sm text-purple-600 mt-1">
            <MapPin className="h-4 w-4 inline mr-1" />
            Agents are filtered by their address city, state, and postal code
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Truck className="h-4 w-4 mr-2" />
            Export Agents
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Agents
            </CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
            <p className="text-xs text-gray-500">In your service areas</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Agents
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                agents.filter(
                  (agent: any) => getAgentPickupJobs(agent).length > 0,
                ).length
              }
            </div>
            <p className="text-xs text-gray-500">Currently available</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Busy Agents
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500">Currently on jobs</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Jobs
            </CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.reduce(
                (total: number, agent: any) =>
                  total + getAgentPickupJobs(agent).length,
                0,
              )}
            </div>
            <p className="text-xs text-gray-500">All time jobs</p>
          </CardContent>
        </Card>
      </div>

      {/* Agents List */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900">
            All Pickup Agents ({agents.length})
          </CardTitle>
          <div className="flex space-x-3">
            <Button variant="outline" className="flex items-center">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No pickup agents found in your service areas.</p>
              <p className="text-sm text-gray-400 mt-2">
                Agents will appear here when they register in your assigned
                regions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {agents.map((agent: any) => {
                const pickupJobs = getAgentPickupJobs(agent);
                const primaryAddress = agent.addresses?.[0];
                const totalJobs = pickupJobs.length;
                const completedJobs = pickupJobs.filter(
                  (job: any) => job.status === "DELIVERED",
                ).length;
                const activeJobs = pickupJobs.filter((job: any) =>
                  [
                    "REQUESTED",
                    "ACCEPTED",
                    "PICKED_UP",
                    "DELIVERY_REQUESTED",
                  ].includes(job.status),
                ).length;

                return (
                  <Card
                    key={agent.id}
                    className="border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-3 rounded-full">
                          <Truck className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {agent.name}
                          </h3>
                          <p className="text-sm text-gray-600">{agent.email}</p>
                          <p className="text-sm text-gray-600 flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {agent.phone || "No phone number"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 text-green-800">
                          ACTIVE
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/cr/agents/${agent.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-800">Location:</p>
                          <p className="text-gray-600 flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {primaryAddress
                              ? `${primaryAddress.city}, ${primaryAddress.state}`
                              : "No address"}
                          </p>
                          {primaryAddress && (
                            <p className="text-gray-600 text-xs">
                              {primaryAddress.postalCode}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Vehicle:</p>
                          <p className="text-gray-600 flex items-center">
                            {getVehicleIcon(
                              agent.pickupAgentProfile?.vehicleType || "truck",
                            )}
                            <span className="ml-1">
                              {agent.pickupAgentProfile?.vehicleType || "Truck"}
                            </span>
                          </p>
                          <p className="text-gray-600 text-xs">
                            Service Areas:{" "}
                            {agent.pickupAgentProfile?.serviceAreas?.length ||
                              0}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            Job Stats:
                          </p>
                          <p className="text-gray-600">
                            {totalJobs} total jobs
                          </p>
                          <p className="text-gray-600 text-xs">
                            {completedJobs} completed, {activeJobs} active
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            Registration:
                          </p>
                          <p className="text-gray-600">
                            {new Intl.DateTimeFormat("en-US", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            }).format(new Date(agent.createdAt))}
                          </p>
                          <p className="text-gray-600 text-xs">Verified</p>
                        </div>
                      </div>

                      {/* Recent Jobs Preview */}
                      {pickupJobs.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="font-medium text-gray-800 mb-2">
                            Recent Jobs:
                          </p>
                          <div className="space-y-2">
                            {pickupJobs.slice(0, 3).map((job: any) => (
                              <div
                                key={job.id}
                                className="bg-blue-50 border border-blue-200 rounded p-3"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-blue-800">
                                      Job #{job.id.slice(-8)}
                                    </p>
                                    <p className="text-sm text-blue-600">
                                      Customer: {job.order.customer.name}
                                    </p>
                                  </div>
                                  <Badge
                                    className={
                                      job.status === "DELIVERED"
                                        ? "bg-green-100 text-green-800"
                                        : job.status === "CANCELLED"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-yellow-100 text-yellow-800"
                                    }
                                  >
                                    {job.status.replace("_", " ")}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            {pickupJobs.length > 3 && (
                              <p className="text-sm text-gray-500 text-center">
                                +{pickupJobs.length - 3} more jobs
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex justify-end space-x-2">
                        <Button variant="outline" size="sm">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Contact Agent
                        </Button>
                        <Button variant="secondary" size="sm" asChild>
                          <Link href={`/dashboard/cr/agents/${agent.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Full Profile
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
