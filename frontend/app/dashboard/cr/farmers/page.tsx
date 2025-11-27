import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { createCRFarmerFilter } from "@/lib/cr-utils";
import {
  Users,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Package,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getCRFarmersData() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    // Get CR profile
    const crProfile = await prisma.cRProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: true,
      },
    });

    if (!crProfile) return null;

    // Get farmers in CR's service areas using proper filtering
    const farmerFilter = createCRFarmerFilter(crProfile);

    // Get farmers with their addresses and products
    const farmers = await prisma.user.findMany({
      where: farmerFilter,
      include: {
        farmerProfile: {
          include: {
            products: {
              include: {
                listings: {
                  where: {
                    isActive: true,
                  },
                },
              },
            },
          },
        },
        addresses: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      crProfile,
      farmers,
    };
  } catch (error) {
    console.error("Error fetching CR farmers data:", error);
    return null;
  }
}

export default async function CRFarmersPage() {
  await requirePermission("read:users");

  const data = await getCRFarmersData();

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Unable to load farmers data.</p>
      </div>
    );
  }

  const { crProfile, farmers } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Farmers in Your Service Areas
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and communicate with farmers in your assigned regions
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <MapPin className="h-4 w-4 mr-2" />
            Service Areas
          </Button>
        </div>
      </div>

      {/* Service Areas Info */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Your Service Areas
          </CardTitle>
          <p className="text-sm text-gray-600">
            Farmers are filtered by their address city, state, and postal code
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {crProfile.serviceAreas.map((area, index) => (
              <Badge
                key={index}
                className="bg-purple-100 text-purple-800 px-3 py-1"
              >
                <MapPin className="h-3 w-3 mr-1" />
                {area}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Farmers List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Farmers ({farmers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {farmers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No farmers found in your service areas</p>
                <p className="text-sm mt-2">
                  Farmers will appear here when they register with addresses in
                  your service areas
                </p>
              </div>
            ) : (
              farmers.map((farmer) => (
                <div
                  key={farmer.id}
                  className="flex items-center justify-between p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {farmer.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800"
                      >
                        Active Farmer
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>{farmer.email}</span>
                      </div>
                      {farmer.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>{farmer.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Joined{" "}
                          {new Intl.DateTimeFormat("en-US", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          }).format(new Date(farmer.createdAt))}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4" />
                        <span>
                          {farmer.farmerProfile?.products?.length || 0} products
                        </span>
                      </div>
                    </div>

                    {/* Address */}
                    {farmer.addresses && farmer.addresses.length > 0 && (
                      <div className="mt-3 p-3 bg-white rounded border">
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                          <div className="text-sm text-gray-600">
                            {farmer.addresses.map((address, index) => (
                              <div key={index}>
                                {address.line1}, {address.city}, {address.state}{" "}
                                {address.postalCode}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Products Preview */}
                    {farmer.farmerProfile?.products &&
                      farmer.farmerProfile.products.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Products:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {farmer.farmerProfile.products
                              .slice(0, 3)
                              .map((product) => (
                                <Badge
                                  key={product.id}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {product.name}
                                </Badge>
                              ))}
                            {farmer.farmerProfile.products.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{farmer.farmerProfile.products.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/cr/farmers/${farmer.id}`}>
                        View Details
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Mail className="h-4 w-4 mr-1" />
                      Contact
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
