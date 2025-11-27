import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import {
  Package,
  ArrowLeft,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

async function getProduct(id: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        farmer: {
          include: {
            user: true,
          },
        },
        listings: {
          where: {
            isActive: true,
          },
          include: {},
        },
        drafts: {
          orderBy: {
            createdAt: "desc",
          },
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-orange-100 text-orange-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "CHANGES_REQUESTED":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-4 w-4" />;
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/admin/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600 mt-1">Product Details</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Product
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Product
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Product Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Name
                  </label>
                  <p className="text-sm text-gray-900">{product.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Category
                  </label>
                  <p className="text-sm text-gray-900">{product.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Base Unit
                  </label>
                  <p className="text-sm text-gray-900">{product.baseUnit}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Farmer
                  </label>
                  <p className="text-sm text-gray-900">
                    {product.farmer.user.name}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Description
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {product.description}
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
              <div className="space-y-4">
                {product.listings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No active listings</p>
                  </div>
                ) : (
                  product.listings.map((listing: any) => (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between p-4 bg-green-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            ₹{Number(listing.pricePerUnit).toFixed(2)} per{" "}
                            {product.baseUnit}
                          </p>
                          <p className="text-sm text-gray-600">
                            Stock: {listing.availableQty} {product.baseUnit}
                          </p>
                          <p className="text-xs text-gray-500">
                            Approved{" "}
                            {listing.approvedAt
                              ? new Intl.DateTimeFormat("en-US", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                }).format(new Date(listing.approvedAt))
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Stats */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Product Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Listings</span>
                <span className="text-sm font-medium">
                  {product.listings.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Pending Drafts</span>
                <span className="text-sm font-medium">
                  {product.drafts.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Stock</span>
                <span className="text-sm font-medium">
                  {product.listings.reduce(
                    (sum: number, listing: any) => sum + listing.availableQty,
                    0,
                  )}{" "}
                  {product.baseUnit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm font-medium">
                  {new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date(product.createdAt))}
                </span>
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
              <div className="space-y-3">
                {product.drafts.length === 0 ? (
                  <p className="text-sm text-gray-500">No drafts</p>
                ) : (
                  product.drafts.slice(0, 3).map((draft: any) => (
                    <div
                      key={draft.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          ₹{Number(draft.pricePerUnit).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {draft.availableQty} {product.baseUnit}
                        </p>
                      </div>
                      <Badge className={getStatusBadgeColor(draft.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(draft.status)}
                          <span>{draft.status}</span>
                        </div>
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
