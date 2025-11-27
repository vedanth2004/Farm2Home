import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { serializeProducts } from "@/lib/serialization";
import { Package, Plus, Filter, Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getFarmerProducts() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

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

    const products = await prisma.product.findMany({
      where: { farmerId: farmerProfile.id },
      include: {
        listings: {
          where: { isActive: true },
        },
        drafts: {
          where: { status: "PENDING" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return products;
  } catch (error) {
    console.error("Error fetching farmer products:", error);
    return [];
  }
}

export default async function FarmerProductsPage() {
  await requirePermission("read:products");

  const products = await getFarmerProducts();
  const serializedProducts = serializeProducts(products);

  const getStatusBadgeColor = (product: any) => {
    if (product.listings.length > 0) return "bg-green-100 text-green-800";
    if (product.drafts.length > 0) return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = (product: any) => {
    if (product.listings.length > 0) return "Active";
    if (product.drafts.length > 0) return "Pending Approval";
    return "Inactive";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
          <p className="text-gray-600 mt-1">Manage your product listings</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" asChild>
            <Link href="/dashboard/farmer/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {serializedProducts.length}
            </div>
            <p className="text-xs text-gray-500">All products</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Listings
            </CardTitle>
            <Package className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                serializedProducts.filter((p: any) => p.listings.length > 0)
                  .length
              }
            </div>
            <p className="text-xs text-gray-500">Live on marketplace</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Approval
            </CardTitle>
            <Package className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                serializedProducts.filter((p: any) => p.drafts.length > 0)
                  .length
              }
            </div>
            <p className="text-xs text-gray-500">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Categories
            </CardTitle>
            <Package className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(serializedProducts.map((p: any) => p.category)).size}
            </div>
            <p className="text-xs text-gray-500">Unique categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Products List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            All Products ({serializedProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {serializedProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No products found</p>
                <p className="text-sm text-gray-400 mt-2">
                  Add your first product to get started
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/dashboard/farmer/products/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Link>
                </Button>
              </div>
            ) : (
              serializedProducts.map((product: any) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {product.category}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(product.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {product.listings.length} active listing
                        {product.listings.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.drafts.length} pending draft
                        {product.drafts.length !== 1 ? "s" : ""}
                      </p>
                      {product.listings.length > 0 && (
                        <p className="text-sm font-medium text-green-600">
                          Your Price: ₹
                          {(
                            product.listings[0].farmerPrice ||
                            product.listings[0].pricePerUnit
                          ).toFixed(2)}
                        </p>
                      )}
                      {product.drafts.length > 0 && (
                        <p className="text-sm font-medium text-orange-600">
                          Draft Price: ₹
                          {(
                            product.drafts[0].farmerPrice ||
                            product.drafts[0].pricePerUnit
                          ).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <Badge className={getStatusBadgeColor(product)}>
                      {getStatusText(product)}
                    </Badge>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        asChild
                      >
                        <Link href={`/dashboard/farmer/products/${product.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        asChild
                      >
                        <Link
                          href={`/dashboard/farmer/products/${product.id}/edit`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
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
