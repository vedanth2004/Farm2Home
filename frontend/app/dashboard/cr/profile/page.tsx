import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import {
  User,
  MapPin,
  Calendar,
  Edit,
  Shield,
  CheckCircle,
  Mail,
  Phone,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getCRProfile() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    // Get CR profile with user data
    const crProfile = await prisma.cRProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          include: {
            addresses: true,
          },
        },
      },
    });

    return crProfile;
  } catch (error) {
    console.error("Error fetching CR profile:", error);
    return null;
  }
}

export default async function CRProfilePage() {
  await requirePermission("read:orders");

  const crProfile = await getCRProfile();

  if (!crProfile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Unable to load profile data.</p>
      </div>
    );
  }

  const primaryAddress = crProfile.user.addresses?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">
            Manage your Community Representative profile
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Profile Overview */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Profile Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Full Name
                  </label>
                  <p className="text-gray-900">{crProfile.user.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Email
                  </label>
                  <p className="text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    {crProfile.user.email}
                  </p>
                </div>
                {crProfile.user.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Phone
                    </label>
                    <p className="text-gray-900 flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      {crProfile.user.phone}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Role
                  </label>
                  <Badge className="bg-purple-100 text-purple-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Community Representative
                  </Badge>
                </div>
              </div>
            </div>

            {/* Service Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Service Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Service Areas
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {crProfile.serviceAreas.map((area, index) => (
                      <Badge
                        key={index}
                        className="bg-purple-100 text-purple-800"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Member Since
                  </label>
                  <p className="text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Intl.DateTimeFormat("en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).format(new Date(crProfile.createdAt))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Status
                  </label>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      {primaryAddress && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Primary Address
                </label>
                <div className="text-gray-900">
                  <p>{primaryAddress.line1}</p>
                  {primaryAddress.line2 && <p>{primaryAddress.line2}</p>}
                  <p>
                    {primaryAddress.city}, {primaryAddress.state} -{" "}
                    {primaryAddress.postalCode}
                  </p>
                  <p>{primaryAddress.country}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Areas Details */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Service Areas Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium text-purple-800 mb-2">
                  Your Service Coverage
                </h4>
                <div className="text-sm text-purple-700 space-y-1">
                  <p>
                    • You are responsible for managing deliveries in the
                    following areas:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    {crProfile.serviceAreas.map((area, index) => (
                      <li key={index}>{area}</li>
                    ))}
                  </ul>
                  <p>
                    • You earn commissions from completed orders in these
                    service areas
                  </p>
                  <p>
                    • You can communicate with customers and farmers in your
                    assigned regions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/cr/orders">
                <User className="h-6 w-6 mb-2" />
                View Orders
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/cr/deliveries">
                <MapPin className="h-6 w-6 mb-2" />
                Track Deliveries
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/cr/earnings">
                <Calendar className="h-6 w-6 mb-2" />
                View Earnings
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/cr/settings">
                <Settings className="h-6 w-6 mb-2" />
                Settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
