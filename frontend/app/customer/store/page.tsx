import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Leaf,
  Truck,
  Shield,
  Star,
  ArrowRight,
  ShoppingCart,
  User,
  Search,
  Package,
  Heart,
  MapPin,
  Clock,
  TrendingUp,
} from "lucide-react";
import CustomerHeader from "@/components/CustomerHeader";

async function getRecentProducts() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const products = await prisma.product.findMany({
      where: {
        listings: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        farmer: {
          include: {
            user: {
              include: {
                addresses: true,
              },
            },
          },
        },
        listings: {
          where: { isActive: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    return products.map((product: any) => ({
      ...product,
      listings: product.listings.map((listing: any) => ({
        ...listing,
        pricePerUnit: Number(listing.pricePerUnit),
      })),
    }));
  } catch (error) {
    console.error("Error fetching recent products:", error);
    return [];
  }
}

export default async function CustomerStorePage() {
  await requirePermission("read:orders");

  const recentProducts = await getRecentProducts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <CustomerHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome to Farm2Home Store!
            </h1>
            <p className="text-xl text-gray-600">
              Fresh produce delivered to your door
            </p>
          </div>

          {/* Hero Section */}
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-700"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="text-white">
                  <h2 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                    Fresh from Farm to Your Door
                  </h2>
                  <p className="text-xl mb-8 text-green-100">
                    Connect directly with local farmers for the freshest
                    produce. Experience farm-fresh vegetables delivered to your
                    doorstep.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      asChild
                      size="lg"
                      className="bg-white text-green-600 hover:bg-gray-100 h-14 px-8 text-lg font-semibold"
                    >
                      <Link
                        href="/customer/store/products"
                        className="flex items-center"
                      >
                        <ShoppingCart className="h-6 w-6 mr-3" />
                        Start Shopping
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/20 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold">500+</div>
                        <div className="text-sm text-green-100">
                          Happy Customers
                        </div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold">50+</div>
                        <div className="text-sm text-green-100">
                          Local Farmers
                        </div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold">1000+</div>
                        <div className="text-sm text-green-100">
                          Orders Delivered
                        </div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold">4.9★</div>
                        <div className="text-sm text-green-100">
                          Customer Rating
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  Why Choose Farm2Home?
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  We connect you directly with local farmers for the freshest,
                  most sustainable produce delivery.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Leaf className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Farm Fresh
                  </h3>
                  <p className="text-gray-600">
                    Direct from local farms to your table. No middlemen, maximum
                    freshness.
                  </p>
                </Card>

                <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                  <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Truck className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Fast Delivery
                  </h3>
                  <p className="text-gray-600">
                    Quick and reliable delivery to your doorstep within 24-48
                    hours.
                  </p>
                </Card>

                <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                  <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Quality Assured
                  </h3>
                  <p className="text-gray-600">
                    Every product is carefully selected and quality-checked
                    before delivery.
                  </p>
                </Card>
              </div>
            </div>
          </section>

          {/* Fresh Products Preview */}
          <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  Fresh Products
                </h2>
                <p className="text-xl text-gray-600">
                  Discover our latest farm-fresh produce
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {recentProducts.map((product: any) => {
                  const listing = product.listings[0];
                  if (!listing) return null;

                  return (
                    <Card
                      key={product.id}
                      className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg"
                    >
                      <div className="aspect-square bg-gradient-to-br from-green-100 to-green-200 rounded-t-lg flex items-center justify-center">
                        <Package className="h-12 w-12 text-green-400" />
                      </div>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {product.name}
                          </h3>
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-current" />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {product.description}
                        </p>
                        <div className="text-xs text-gray-500 mb-3">
                          by {product.farmer.user.name}
                          {product.farmer.user.addresses &&
                            product.farmer.user.addresses.length > 0 && (
                              <span className="ml-2 text-green-600">
                                • {product.farmer.user.addresses[0].city},{" "}
                                {product.farmer.user.addresses[0].state}
                              </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-2xl font-bold text-green-600">
                              ₹{Number(listing.pricePerUnit).toFixed(2)}
                            </span>
                            <span className="text-gray-500 text-sm ml-1">
                              per {product.baseUnit}
                            </span>
                          </div>
                          <Button
                            asChild
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Link href="/customer/store/products">
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="text-center mt-12">
                <Button
                  size="lg"
                  asChild
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Link href="/customer/store/products">
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    View All Products
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  asChild
                >
                  <Link href="/customer/store/products">
                    <ShoppingCart className="h-6 w-6" />
                    <span>Browse Products</span>
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  asChild
                >
                  <Link href="/customer/store/orders">
                    <Package className="h-6 w-6" />
                    <span>My Orders</span>
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  asChild
                >
                  <Link href="/customer/store/cart">
                    <ShoppingCart className="h-6 w-6" />
                    <span>My Cart</span>
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  asChild
                >
                  <Link href="/customer/store/feedback">
                    <Heart className="h-6 w-6" />
                    <span>Feedback</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
