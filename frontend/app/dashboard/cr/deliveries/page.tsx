import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { createCRPickupJobFilter } from "@/lib/cr-utils";
import {
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  User,
  Phone,
  Mail,
  Navigation,
  Calendar,
  Filter,
  Search,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getCRDeliveries() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    // Get CR profile
    const crProfile = await prisma.cRProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!crProfile) return [];

    // Get pickup jobs for orders in CR's service areas using comprehensive filtering
    const pickupJobFilter = createCRPickupJobFilter(crProfile);
    const pickupJobs = await prisma.pickupJob.findMany({
      where: pickupJobFilter,
      include: {
        order: {
          include: {
            customer: {
              include: {
                addresses: true,
              },
            },
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
            shippingAddress: true,
          },
        },
        agent: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return pickupJobs;
  } catch (error) {
    console.error("Error fetching CR deliveries:", error);
    return [];
  }
}

export default async function CRDeliveriesPage() {
  await requirePermission("read:delivery");

  const pickupJobs = await getCRDeliveries();

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "DELIVERY_REQUESTED":
        return "bg-purple-100 text-purple-800";
      case "PICKED_UP":
        return "bg-blue-100 text-blue-800";
      case "ACCEPTED":
        return "bg-orange-100 text-orange-800";
      case "REQUESTED":
        return "bg-yellow-100 text-yellow-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      case "PICKED_UP":
        return <Truck className="h-4 w-4" />;
      case "DELIVERY_REQUESTED":
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getOrderStatusBadgeColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "PICKED_UP":
        return "bg-purple-100 text-purple-800";
      case "OUT_FOR_DELIVERY":
        return "bg-orange-100 text-orange-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Delivery Tracking
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor pickup and delivery progress for orders in your assigned
            service areas
          </p>
          <p className="text-sm text-purple-600 mt-1">
            <MapPin className="h-4 w-4 inline mr-1" />
            Deliveries are filtered by customer address city, state, and postal
            code
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" className="flex items-center">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Jobs
            </CardTitle>
            <Truck className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pickupJobs.length}</div>
            <p className="text-xs text-gray-500">All pickup jobs</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Delivered
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                pickupJobs.filter((job: any) => job.status === "DELIVERED")
                  .length
              }
            </div>
            <p className="text-xs text-gray-500">Completed deliveries</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              In Progress
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                pickupJobs.filter(
                  (job: any) =>
                    !["DELIVERED", "CANCELLED"].includes(job.status),
                ).length
              }
            </div>
            <p className="text-xs text-gray-500">Active jobs</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                pickupJobs.filter(
                  (job: any) => job.status === "DELIVERY_REQUESTED",
                ).length
              }
            </div>
            <p className="text-xs text-gray-500">Awaiting customer approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Jobs List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Delivery Jobs ({pickupJobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pickupJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No delivery jobs found in your service areas</p>
              </div>
            ) : (
              pickupJobs.map((job: any) => (
                <div
                  key={job.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Job #{job.id.slice(-8)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Order #{job.order.id.slice(-8)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Created on{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }).format(new Date(job.createdAt))}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={getStatusBadgeColor(job.status)}>
                        {getStatusIcon(job.status)}
                        <span className="ml-1">
                          {job.status.replace("_", " ")}
                        </span>
                      </Badge>
                      <Badge
                        className={getOrderStatusBadgeColor(job.order.status)}
                      >
                        Order: {job.order.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Customer Information */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Customer Information
                      </h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="font-medium">{job.order.customer.name}</p>
                        <p className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {job.order.customer.email}
                        </p>
                        {job.order.customer.phone && (
                          <p className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {job.order.customer.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        Delivery Address
                      </h4>
                      <div className="text-sm text-gray-600">
                        <p>
                          {job.order.shippingAddress?.line1 ||
                            "Address not available"}
                        </p>
                        <p>
                          {job.order.shippingAddress?.city ||
                            "City not available"}
                          ,{" "}
                          {job.order.shippingAddress?.postalCode ||
                            "Postal code not available"}
                        </p>
                      </div>
                    </div>

                    {/* Pickup Agent Information */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <Truck className="h-4 w-4 mr-2" />
                        Pickup Agent
                      </h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="font-medium">
                          {job.agent?.user?.name || "Agent not assigned"}
                        </p>
                        {job.agent?.user?.phone && (
                          <p className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {job.agent.user.phone}
                          </p>
                        )}
                        {job.agent?.user?.email && (
                          <p className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {job.agent.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Items Summary */}
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Order Items
                    </h4>
                    <div className="space-y-2">
                      {job.order.items.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {item.listing.product.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              by{" "}
                              {item.listing.product.farmer?.user?.name ||
                                "Unknown Farmer"}
                            </p>
                            <p className="text-sm text-gray-500">
                              Qty: {item.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Timeline
                    </h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        • Job created:{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(job.createdAt))}
                      </p>
                      {job.pickupEta && (
                        <p>
                          • Pickup ETA:{" "}
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
                        <p>
                          • Delivery ETA:{" "}
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

                  {/* Actions */}
                  <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/cr/orders/${job.order.id}`}>
                        View Order Details
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm">
                      <Navigation className="h-4 w-4 mr-1" />
                      Track Location
                    </Button>
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-1" />
                      Contact Agent
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
