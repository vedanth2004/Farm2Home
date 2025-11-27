import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { serializeOrders } from "@/lib/serialization";
import {
  ArrowLeft,
  Truck,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  MessageCircle,
  User,
  Car,
  Bike,
  TrendingUp,
  Star,
  FileText,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getAgentDetails(agentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CR") {
    return null;
  }

  const crProfile = await prisma.cRProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!crProfile) return null;

  const agent = await prisma.user.findFirst({
    where: {
      id: agentId,
      role: "PICKUP_AGENT",
      OR: [
        {
          addresses: {
            some: {
              city: {
                in: crProfile.serviceAreas,
              },
            },
          },
        },
        {
          addresses: {
            some: {
              state: {
                in: crProfile.serviceAreas,
              },
            },
          },
        },
        {
          addresses: {
            some: {
              postalCode: {
                in: crProfile.serviceAreas,
              },
            },
          },
        },
      ],
    },
    include: {
      pickupAgentProfile: {
        include: {
          pickupJobs: {
            include: {
              order: {
                include: {
                  customer: true,
                  shippingAddress: true,
                  items: {
                    include: {
                      listing: {
                        include: {
                          product: true,
                        },
                      },
                    },
                  },
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

  return agent;
}

export default async function CRAgentDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePermission("read:users");

  const agent = await getAgentDetails(params.id);

  if (!agent) {
    return (
      <div className="text-center py-10">
        <h1 className="text-3xl font-bold text-gray-900">Agent Not Found</h1>
        <p className="text-gray-600 mt-2">
          This pickup agent is not in your service areas or doesn&apos;t exist.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/cr/agents">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Link>
        </Button>
      </div>
    );
  }

  const pickupJobs = agent.pickupAgentProfile?.pickupJobs || [];
  const serializedJobs = serializeOrders(pickupJobs.map((job) => job.order));
  const primaryAddress = agent.addresses[0];
  const totalJobs = pickupJobs.length;
  const completedJobs = pickupJobs.filter(
    (job) => job.status === "DELIVERED",
  ).length;
  const activeJobs = pickupJobs.filter((job) =>
    ["REQUESTED", "ACCEPTED", "PICKED_UP", "DELIVERY_REQUESTED"].includes(
      job.status,
    ),
  ).length;
  const cancelledJobs = pickupJobs.filter(
    (job) => job.status === "CANCELLED",
  ).length;

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType?.toLowerCase()) {
      case "car":
        return <Car className="h-6 w-6" />;
      case "motorcycle":
        return <Bike className="h-6 w-6" />;
      case "bike":
        return <Bike className="h-6 w-6" />;
      default:
        return <Truck className="h-6 w-6" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "PICKED_UP":
        return "bg-purple-100 text-purple-800";
      case "DELIVERY_REQUESTED":
        return "bg-yellow-100 text-yellow-800";
      case "ACCEPTED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/cr/agents">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Agents
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{agent.name}</h1>
            <p className="text-gray-600">Pickup Agent Profile Details</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <MessageCircle className="h-4 w-4 mr-2" />
            Contact Agent
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Jobs
            </CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
            <p className="text-xs text-gray-500">All time jobs</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed Jobs
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedJobs}</div>
            <p className="text-xs text-gray-500">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Jobs
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs}</div>
            <p className="text-xs text-gray-500">Currently in progress</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Success Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalJobs > 0
                ? Math.round((completedJobs / totalJobs) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-gray-500">Delivery success rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agent Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-gray-900">Name:</p>
                  <p className="text-gray-700">{agent.name}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Email:</p>
                  <p className="text-gray-700 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {agent.email}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Phone:</p>
                  <p className="text-gray-700 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    {agent.phone || "No phone number"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Role:</p>
                  <Badge className="bg-blue-100 text-blue-800">
                    <Truck className="h-3 w-3 mr-1" />
                    {agent.role}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Registration Date:
                  </p>
                  <p className="text-gray-700 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Intl.DateTimeFormat("en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).format(new Date(agent.createdAt))}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Status:</p>
                  <Badge className="bg-green-100 text-green-800">ACTIVE</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <MapPin className="h-5 w-5 mr-2" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agent.addresses.length > 0 ? (
                <div className="space-y-4">
                  {agent.addresses.map((address, index) => (
                    <div
                      key={address.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {address.label || `Address ${index + 1}`}
                        </h4>
                        {index === 0 && (
                          <Badge className="bg-blue-100 text-blue-800">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="text-gray-700 space-y-1">
                        <p>{address.line1}</p>
                        {address.line2 && <p>{address.line2}</p>}
                        <p>
                          {address.city}, {address.state} - {address.postalCode}
                        </p>
                        <p>{address.country}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No addresses found</p>
              )}
            </CardContent>
          </Card>

          {/* Job History */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <Package className="h-5 w-5 mr-2" />
                Job History ({totalJobs})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pickupJobs.length > 0 ? (
                <div className="space-y-4">
                  {pickupJobs.map((job) => (
                    <div
                      key={job.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          Job #{job.id.slice(-8)}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusBadgeColor(job.status)}>
                            {job.status.replace("_", " ")}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Intl.DateTimeFormat("en-US", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            }).format(new Date(job.createdAt))}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-800">Customer:</p>
                          <p className="text-gray-600">
                            {job.order.customer.name}
                          </p>
                          <p className="text-gray-600">
                            {job.order.customer.email}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            Order Details:
                          </p>
                          <p className="text-gray-600">
                            Order #{job.order.id.slice(-8)}
                          </p>
                          <p className="text-gray-600">
                            ₹{job.order.totalAmount.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            Delivery Address:
                          </p>
                          <p className="text-gray-600">
                            {job.order.shippingAddress?.line1 || "No address"}
                          </p>
                          <p className="text-gray-600">
                            {job.order.shippingAddress?.city || "No city"},{" "}
                            {job.order.shippingAddress?.state || "No state"}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Timeline:</p>
                          {job.pickupEta && (
                            <p className="text-gray-600">
                              Pickup ETA:{" "}
                              {new Intl.DateTimeFormat("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(job.pickupEta))}
                            </p>
                          )}
                          {job.dropoffEta && (
                            <p className="text-gray-600">
                              Dropoff ETA:{" "}
                              {new Intl.DateTimeFormat("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(job.dropoffEta))}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No jobs found</p>
                  <p className="text-sm text-gray-400 mt-2">
                    This agent hasn&apos;t completed any pickup jobs yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agent Profile Details */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <Shield className="h-5 w-5 mr-2" />
                Agent Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {agent.pickupAgentProfile ? (
                <>
                  <div>
                    <p className="font-medium text-gray-900">Vehicle Type:</p>
                    <p className="text-gray-700 flex items-center">
                      {getVehicleIcon(
                        agent.pickupAgentProfile.vehicleType || "truck",
                      )}
                      <span className="ml-2">
                        {agent.pickupAgentProfile.vehicleType || "Truck"}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Service Areas:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {agent.pickupAgentProfile.serviceAreas?.map(
                        (area, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {area}
                          </Badge>
                        ),
                      ) || (
                        <span className="text-gray-500">No service areas</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Verification Status:
                    </p>
                    <Badge className="bg-green-100 text-green-800">
                      Verified
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Profile Status:</p>
                    <Badge className="bg-green-100 text-green-800">
                      ACTIVE
                    </Badge>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">No agent profile found</p>
              )}
            </CardContent>
          </Card>

          {/* Performance Stats */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900">Performance Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Success Rate:</span>
                <span className="font-medium">
                  {totalJobs > 0
                    ? Math.round((completedJobs / totalJobs) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Cancellation Rate:
                </span>
                <span className="font-medium">
                  {totalJobs > 0
                    ? Math.round((cancelledJobs / totalJobs) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Avg Jobs per Month:
                </span>
                <span className="font-medium">
                  {Math.round(
                    totalJobs /
                      Math.max(
                        1,
                        Math.ceil(
                          (Date.now() - new Date(agent.createdAt).getTime()) /
                            (30 * 24 * 60 * 60 * 1000),
                        ),
                      ),
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Agent
              </Button>
              <Button className="w-full" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                View All Jobs
              </Button>
              <Button className="w-full" variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              <Button className="w-full" variant="outline">
                <Star className="h-4 w-4 mr-2" />
                Rate Agent
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
