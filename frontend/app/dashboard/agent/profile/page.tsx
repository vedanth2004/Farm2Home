import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  User,
  MapPin,
  Truck,
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  Building,
  Navigation,
  Clock,
  CheckCircle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getPickupAgentProfile() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    // Get agent profile with all related data
    const agentProfile = await prisma.pickupAgentProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          include: {
            addresses: true,
          },
        },
      },
    });

    if (!agentProfile) {
      // Create agent profile if it doesn't exist
      const newAgentProfile = await prisma.pickupAgentProfile.create({
        data: {
          userId: session.user.id,
          vehicleType: "Bike",
          serviceAreas: ["Default Area"],
        },
        include: {
          user: {
            include: {
              addresses: true,
            },
          },
        },
      });
      return newAgentProfile;
    }

    return agentProfile;
  } catch (error) {
    console.error("Error fetching pickup agent profile:", error);
    return null;
  }
}

export default async function PickupAgentProfilePage() {
  await requirePermission("read:pickup");

  const agentProfile = await getPickupAgentProfile();

  if (!agentProfile) {
    return (
      <div className="text-center py-16">
        <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
          <Truck className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Profile Not Found
        </h3>
        <p className="text-gray-600">
          Your pickup agent profile could not be found. Please contact support.
        </p>
      </div>
    );
  }

  const user = agentProfile.user;
  const primaryAddress = user.addresses[0];

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
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600">
              View and manage your pickup agent profile information
            </p>
          </div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Full Name
                </label>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Phone
                </label>
                <p className="text-sm font-medium text-gray-900 flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  {user.phone || "Not provided"}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-sm font-medium text-gray-900 flex items-center">
                <Mail className="h-4 w-4 mr-1" />
                {user.email}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Language
              </label>
              <p className="text-sm font-medium text-gray-900">
                {user.locale.toUpperCase()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Location Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {primaryAddress ? (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Address
                  </label>
                  <p className="text-sm font-medium text-gray-900">
                    {primaryAddress.line1}
                  </p>
                  {primaryAddress.line2 && (
                    <p className="text-sm font-medium text-gray-900">
                      {primaryAddress.line2}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      City
                    </label>
                    <p className="text-sm font-medium text-gray-900">
                      {primaryAddress.city}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      State
                    </label>
                    <p className="text-sm font-medium text-gray-900">
                      {primaryAddress.state}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Pincode
                    </label>
                    <p className="text-sm font-medium text-gray-900">
                      {primaryAddress.postalCode}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Country
                    </label>
                    <p className="text-sm font-medium text-gray-900">
                      {primaryAddress.country}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No address information available</p>
            )}
          </CardContent>
        </Card>

        {/* Agent-Specific Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Agent Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">
                Vehicle Type
              </label>
              <p className="text-sm font-medium text-gray-900 flex items-center">
                <Truck className="h-4 w-4 mr-1" />
                {agentProfile.vehicleType || "Not specified"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Service Areas
              </label>
              <div className="flex flex-wrap gap-2">
                {agentProfile.serviceAreas.map((area, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Profile Created
              </label>
              <p className="text-sm font-medium text-gray-900">
                {new Intl.DateTimeFormat("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date(agentProfile.createdAt))}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Last Updated
              </label>
              <p className="text-sm font-medium text-gray-900">
                {new Intl.DateTimeFormat("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date(agentProfile.updatedAt))}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Role</label>
              <p className="text-sm font-medium text-gray-900">Pickup Agent</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Account Created
              </label>
              <p className="text-sm font-medium text-gray-900">
                {new Intl.DateTimeFormat("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date(user.createdAt))}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Last Updated
              </label>
              <p className="text-sm font-medium text-gray-900">
                {new Intl.DateTimeFormat("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date(user.updatedAt))}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Two-Factor Authentication
              </label>
              <div className="flex items-center">
                <Badge
                  className={
                    user.twoFactorEnabled
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Navigation className="h-5 w-5 mr-2" />
            Service Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-orange-600 mt-1" />
              <div>
                <h4 className="font-medium text-orange-800 mb-2">
                  Service Coverage
                </h4>
                <p className="text-sm text-orange-700 mb-3">
                  You provide pickup services in the following areas:
                </p>
                <div className="flex flex-wrap gap-2">
                  {agentProfile.serviceAreas.map((area, index) => (
                    <Badge
                      key={index}
                      className="bg-orange-100 text-orange-800"
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
