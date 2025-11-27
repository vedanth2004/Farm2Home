import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import {
  Package,
  ArrowLeft,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";

async function getProduct(productId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    // Get or create farmer profile
    let farmerProfile = await prisma.farmerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!farmerProfile) {
      // Create farmer profile if it doesn't exist
      farmerProfile = await prisma.farmerProfile.create({
        data: {
          userId: session.user.id,
          verified: true,
          upiId: null, // Will be set later by the farmer
        },
      });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        farmerId: farmerProfile.id,
      },
      include: {
        listings: {
          where: { isActive: true },
        },
        drafts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return product;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePermission("read:products");

  const product = await getProduct(params.id);

  if (!product) {
    notFound();
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "CHANGES_REQUESTED":
        return <Edit className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "CHANGES_REQUESTED":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-orange-100 text-orange-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/farmer/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-gray-600 mt-1">
            {product.category} • {product.baseUnit}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/farmer/products/${product.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Product Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">{product.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Category</h3>
                  <Badge variant="outline">{product.category}</Badge>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Base Unit</h3>
                  <p className="text-gray-600">{product.baseUnit}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Created</h3>
                <p className="text-gray-600">
                  {new Date(product.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Active Listings */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Active Listings ({product.listings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.listings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No active listings</p>
                  <p className="text-sm text-gray-400">
                    Create a listing to start selling
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {product.listings.map((listing: any) => (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between p-4 bg-green-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          ₹{Number(listing.pricePerUnit).toFixed(2)} per{" "}
                          {product.baseUnit}
                        </p>
                        <p className="text-sm text-gray-600">
                          Available: {listing.availableQty} {product.baseUnit}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Listings</span>
                  <span className="text-sm font-medium">
                    {product.listings.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pending Drafts</span>
                  <span className="text-sm font-medium">
                    {product.drafts.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Stock</span>
                  <span className="text-sm font-medium">
                    {product.listings.reduce(
                      (sum: number, listing: any) => sum + listing.availableQty,
                      0,
                    )}{" "}
                    {product.baseUnit}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Drafts */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Recent Drafts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.drafts.length === 0 ? (
                <p className="text-sm text-gray-500">No pending drafts</p>
              ) : (
                <div className="space-y-3">
                  {product.drafts.slice(0, 3).map((draft: any) => (
                    <div
                      key={draft.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          ₹{Number(draft.pricePerUnit).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Intl.DateTimeFormat("en-US", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          }).format(new Date(draft.createdAt))}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(draft.status)}
                        <Badge className={getStatusColor(draft.status)}>
                          {draft.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
