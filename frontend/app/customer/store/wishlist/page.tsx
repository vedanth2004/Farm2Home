"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, ShoppingCart, Trash2 } from "lucide-react";

interface WishlistProduct {
  id: string;
  name: string;
  category: string;
  photos: string[];
  price: number;
  averageRating: number;
  reviewCount: number;
  addedAt: string;
  listings: Array<{
    availableQty: number;
  }>;
}

export default function WishlistPage() {
  const router = useRouter();
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const response = await fetch("/api/wishlist");
      const result = await response.json();

      if (result.success) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      await fetch(`/api/wishlist?productId=${productId}`, {
        method: "DELETE",
      });
      setProducts(products.filter((p) => p.id !== productId));
    } catch (error) {
      console.error("Error removing from wishlist:", error);
    }
  };

  const handleAddToCart = async (productId: string) => {
    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity: 1,
        }),
      });
      router.push("/customer/store/cart");
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">My Wishlist</h1>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="mx-auto h-16 w-16 text-gray-300" />
            <p className="mt-4 text-lg text-gray-600">Your wishlist is empty</p>
            <Link href="/customer/store/products">
              <Button className="mt-4">Browse Products</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const activeListing = product.listings[0];
            const available = (activeListing?.availableQty || 0) > 0;

            return (
              <Card key={product.id} className="overflow-hidden">
                <Link href={`/customer/store/products/${product.id}`}>
                  <div className="relative aspect-square w-full">
                    {product.photos[0] ? (
                      <Image
                        src={product.photos[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gray-100">
                        <ShoppingCart className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    <Badge className="absolute left-2 top-2">
                      {product.category}
                    </Badge>
                  </div>
                </Link>
                <CardContent className="p-4">
                  <Link href={`/customer/store/products/${product.id}`}>
                    <h3 className="mb-2 font-semibold hover:underline">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="mb-2 flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">
                      {product.averageRating.toFixed(1)} ({product.reviewCount})
                    </span>
                  </div>
                  <p className="mb-4 text-xl font-bold">
                    ₹{product.price.toFixed(2)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAddToCart(product.id)}
                      disabled={!available}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to Cart
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemove(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {!available && (
                    <p className="mt-2 text-xs text-red-500">Out of stock</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
