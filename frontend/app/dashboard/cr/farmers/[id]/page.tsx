import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { serializeProducts } from "@/lib/serialization";
import {
  ArrowLeft,
  Leaf,
  MapPin,
  Phone,
  Mail,
  Package,
  DollarSign,
  Calendar,
  Star,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  MessageCircle,
  User,
  FileText,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getFarmerDetails(farmerId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CR") {
    return null;
  }

  const crProfile = await prisma.cRProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!crProfile) return null;

  const farmer = await prisma.user.findFirst({
    where: {
      id: farmerId,
      role: "FARMER",
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
      farmerProfile: {
        include: {
          products: {
            include: {
              listings: {
                orderBy: { createdAt: "desc" },
              },
              drafts: {
                orderBy: { createdAt: "desc" },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      addresses: true,
    },
  });

  return farmer;
}

export default async function CRFarmerDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePermission("read:users");

  const farmer = await getFarmerDetails(params.id);

  if (!farmer) {
    return (
      <div className="text-center py-10">
        <h1 className="text-3xl font-bold text-gray-900">Farmer Not Found</h1>
        <p className="text-gray-600 mt-2">
          This farmer is not in your service areas or doesn&apos;t exist.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/cr/farmers">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Farmers
          </Link>
        </Button>
      </div>
    );
  }

  const products = farmer.farmerProfile?.products || [];
  const serializedProducts = serializeProducts(products);
  const primaryAddress = farmer.addresses[0];
  const totalListings = products.reduce(
    (total, product) => total + product.listings.length,
    0,
  );
  const totalDrafts = products.reduce(
    (total, product) => total + product.drafts.length,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/cr/farmers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Farmers
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{farmer.name}</h1>
            <p className="text-gray-600">Farmer Profile Details</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <MessageCircle className="h-4 w-4 mr-2" />
            Contact Farmer
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-gray-500">Products created</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Listings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalListings}</div>
            <p className="text-xs text-gray-500">Currently selling</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Drafts
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDrafts}</div>
            <p className="text-xs text-gray-500">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Verification Status
            </CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {farmer.farmerProfile?.govtId ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
            </div>
            <p className="text-xs text-gray-500">
              {farmer.farmerProfile?.govtId ? "Verified" : "Unverified"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Farmer Information */}
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
                  <p className="text-gray-700">{farmer.name}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Email:</p>
                  <p className="text-gray-700 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {farmer.email}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Phone:</p>
                  <p className="text-gray-700 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    {farmer.phone || "No phone number"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Role:</p>
                  <Badge className="bg-green-100 text-green-800">
                    <Leaf className="h-3 w-3 mr-1" />
                    {farmer.role}
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
                    }).format(new Date(farmer.createdAt))}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Status:</p>
                  <Badge
                    className={
                      farmer.accountStatus === "APPROVED"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {farmer.accountStatus || "PENDING_VERIFICATION"}
                  </Badge>
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
              {farmer.addresses.length > 0 ? (
                <div className="space-y-4">
                  {farmer.addresses.map((address, index) => (
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

          {/* Products */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <Package className="h-5 w-5 mr-2" />
                Products ({products.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {serializedProducts.length > 0 ? (
                <div className="space-y-4">
                  {serializedProducts.map((product: any) => (
                    <div
                      key={product.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          {product.name}
                        </h4>
                        <div className="flex space-x-2">
                          <Badge variant="outline">{product.category}</Badge>
                          <Badge className="bg-blue-100 text-blue-800">
                            {product.listings.length} listings
                          </Badge>
                          {product.drafts.length > 0 && (
                            <Badge className="bg-orange-100 text-orange-800">
                              {product.drafts.length} drafts
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">
                        {product.description}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-800">
                            Base Unit:
                          </p>
                          <p className="text-gray-600">{product.baseUnit}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Created:</p>
                          <p className="text-gray-600">
                            {new Intl.DateTimeFormat("en-US", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            }).format(new Date(product.createdAt))}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            Last Updated:
                          </p>
                          <p className="text-gray-600">
                            {new Intl.DateTimeFormat("en-US", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            }).format(new Date(product.updatedAt))}
                          </p>
                        </div>
                      </div>

                      {/* Listings */}
                      {product.listings.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="font-medium text-gray-800 mb-2">
                            Active Listings:
                          </p>
                          <div className="space-y-2">
                            {product.listings.map((listing: any) => (
                              <div
                                key={listing.id}
                                className="bg-green-50 border border-green-200 rounded p-3"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-green-800">
                                      ₹{listing.pricePerUnit} per{" "}
                                      {product.baseUnit}
                                    </p>
                                    <p className="text-sm text-green-600">
                                      Available: {listing.availableQty}{" "}
                                      {product.baseUnit}
                                    </p>
                                  </div>
                                  <Badge className="bg-green-100 text-green-800">
                                    Active
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Drafts */}
                      {product.drafts.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="font-medium text-gray-800 mb-2">
                            Pending Drafts:
                          </p>
                          <div className="space-y-2">
                            {product.drafts.map((draft: any) => (
                              <div
                                key={draft.id}
                                className="bg-orange-50 border border-orange-200 rounded p-3"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-orange-800">
                                      ₹{draft.pricePerUnit} per{" "}
                                      {product.baseUnit}
                                    </p>
                                    <p className="text-sm text-orange-600">
                                      Quantity: {draft.quantity}{" "}
                                      {product.baseUnit}
                                    </p>
                                  </div>
                                  <Badge className="bg-orange-100 text-orange-800">
                                    Pending
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No products found</p>
                  <p className="text-sm text-gray-400 mt-2">
                    This farmer hasn&apos;t created any products yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Farmer Profile Details */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <Shield className="h-5 w-5 mr-2" />
                Farmer Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {farmer.farmerProfile ? (
                <>
                  <div>
                    <p className="font-medium text-gray-900">Government ID:</p>
                    <p className="text-gray-700">
                      {farmer.farmerProfile.govtId || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">UPI ID:</p>
                    <p className="text-gray-700">
                      {farmer.farmerProfile.upiId || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Description:</p>
                    <p className="text-gray-700">
                      {farmer.farmerProfile?.govtId
                        ? `Verified Farmer (ID: ${farmer.farmerProfile.govtId})`
                        : "No description provided"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Profile Status:</p>
                    <Badge
                      className={
                        farmer.accountStatus === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {farmer.accountStatus || "PENDING_VERIFICATION"}
                    </Badge>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">No farmer profile found</p>
              )}
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
                Contact Farmer
              </Button>
              <Button className="w-full" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                View Orders
              </Button>
              <Button className="w-full" variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              <Button className="w-full" variant="outline">
                <Star className="h-4 w-4 mr-2" />
                Rate Farmer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
