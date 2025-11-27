import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Leaf, Star, ShoppingCart, Heart, Filter, Search } from "lucide-react";
import Image from "next/image";
import PublicStoreHeader from "@/components/PublicStoreHeader";

async function getProducts() {
  try {
    const products = await prisma.product.findMany({
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
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      where: {
        listings: {
          some: {
            isActive: true,
          },
        },
      },
    });
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <PublicStoreHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              Fresh Farm Products
            </h1>
            <p className="text-xl text-green-100 mb-8 max-w-3xl mx-auto">
              Discover the finest selection of fresh fruits and vegetables
              directly from local farmers. Quality guaranteed, freshness
              delivered.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="outline" className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-green-100"
              >
                All Products
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-green-50"
              >
                Vegetables
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-green-50"
              >
                Fruits
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-green-50"
              >
                Organic
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {products.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Products Available
              </h3>
              <p className="text-gray-600 mb-6">
                Check back later for fresh farm products!
              </p>
              <Button asChild>
                <Link href="/store">Back to Home</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  {products.length} Products Available
                </h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <select className="border border-gray-300 rounded-md px-3 py-1 text-sm">
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                    <option>Name: A to Z</option>
                    <option>Name: Z to A</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product: any) => {
                  const activeListing = product.listings[0];
                  if (!activeListing) return null;

                  return (
                    <Card
                      key={product.id}
                      className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg"
                    >
                      <div className="relative">
                        <div className="aspect-square bg-gradient-to-br from-green-100 to-green-200 rounded-t-lg flex items-center justify-center">
                          {product.photos && product.photos.length > 0 ? (
                            <Image
                              src={product.photos[0]}
                              alt={product.name}
                              width={200}
                              height={200}
                              className="object-cover rounded-t-lg"
                            />
                          ) : (
                            <Leaf className="h-16 w-16 text-green-400" />
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Badge className="absolute top-2 left-2 bg-green-600">
                          Fresh
                        </Badge>
                      </div>

                      <CardContent className="p-4">
                        <div className="mb-2">
                          <h3 className="font-semibold text-gray-900 line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {product.description}
                          </p>
                        </div>

                        <div className="flex items-center mb-2">
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-current" />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600 ml-2">
                            (4.8)
                          </span>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-lg font-bold text-green-600">
                              ₹{Number(activeListing.pricePerUnit).toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-600 ml-1">
                              / {product.baseUnit}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {activeListing.availableQty} in stock
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 mb-3">
                          by {product.farmer.user.name}
                        </div>

                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Cart
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Can&apos;t Find What You&apos;re Looking For?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Contact us and we&apos;ll help you find the perfect fresh produce
            for your needs.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-green-600 hover:bg-gray-100"
          >
            <Link href="/#contact">Contact Us</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-600 p-2 rounded-xl mr-3">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <h4 className="text-2xl font-bold">Farm2Home</h4>
            </div>
            <p className="text-gray-400 mb-4">
              Connecting farmers with customers for fresh, local produce
            </p>
            <p className="text-sm text-gray-500">
              © 2024 Farm2Home. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
