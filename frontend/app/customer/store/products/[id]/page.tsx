"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Star,
  Heart,
  ShoppingCart,
  Package,
  Truck,
  MapPin,
  User,
  Calendar,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import CustomerHeader from "@/components/CustomerHeader";

interface FarmerOption {
  productId: string;
  farmer: {
    id: string;
    name: string;
    verified: boolean;
    location: string;
  };
  listings: Array<{
    id: string;
    price: number;
    farmerPrice: number;
    availableQty: number;
    createdAt: string;
  }>;
  bestPrice: number;
}

interface ProductDetails {
  id: string;
  name: string;
  category: string;
  description: string;
  baseUnit?: string;
  photos: string[];
  price: number;
  averageRating: number;
  reviewCount: number;
  isInWishlist: boolean;
  expectedDeliveryDays: number;
  availableQty: number;
  farmer: {
    user: {
      name: string;
      email: string;
      addresses: Array<{
        city: string;
        state: string;
      }>;
    };
  };
  farmerRating: number;
  farmerReviewCount: number;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    author: {
      name: string;
    };
  }>;
  // New fields for multiple farmers
  availableFarmers?: FarmerOption[];
  hasMultipleFarmers?: boolean;
  // Listings field
  listings?: Array<{
    id: string;
    pricePerUnit: number;
    storePrice?: number;
    farmerPrice?: number;
    availableQty: number;
    isActive: boolean;
  }>;
}

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  // Farmer selection state
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerOption | null>(
    null,
  );
  const [selectedListingId, setSelectedListingId] = useState<string | null>(
    null,
  );
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      const result = await response.json();

      if (result.success) {
        setProduct(result.data);
        // Set default selected farmer if multiple farmers available
        if (
          result.data.hasMultipleFarmers &&
          result.data.availableFarmers?.length
        ) {
          const defaultFarmer = result.data.availableFarmers[0];
          setSelectedFarmer(defaultFarmer);
          setSelectedListingId(defaultFarmer.listings[0]?.id || null);
        } else {
          // Single farmer - use the product's own listing
          setSelectedFarmer(null);
          setSelectedListingId(null);
        }
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleSubmitReview = async () => {
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      alert("Please select a rating between 1 and 5 stars");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: productId,
          rating: reviewRating,
          comment: reviewComment || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setReviewSubmitted(true);
        setShowReviewForm(false);
        setReviewRating(0);
        setReviewComment("");
        // Refresh product data after a delay to show updated review count
        setTimeout(() => {
          fetchProduct();
        }, 2000);
      } else {
        alert(result.message || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // Determine which listing to use
    const listingId = selectedListingId || product.listings?.[0]?.id;
    const productIdToUse = selectedFarmer?.productId || product.id;

    if (!listingId) {
      alert("Please select a farmer and listing");
      return;
    }

    setIsAddingToCart(true);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: productIdToUse,
          listingId: listingId, // Use selected listing
          quantity,
        }),
      });

      if (response.ok) {
        router.push("/customer/store/cart");
      } else {
        const result = await response.json();
        alert(result.message || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("Failed to add to cart. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!product) return;

    setIsTogglingWishlist(true);
    try {
      if (product.isInWishlist) {
        await fetch(`/api/wishlist?productId=${product.id}`, {
          method: "DELETE",
        });
        setProduct({ ...product, isInWishlist: false });
      } else {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        });
        setProduct({ ...product, isInWishlist: true });
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
    } finally {
      setIsTogglingWishlist(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Product not found</div>
      </div>
    );
  }

  const farmerLocation =
    product.farmer.user.addresses[0]?.city &&
    product.farmer.user.addresses[0]?.state
      ? `${product.farmer.user.addresses[0].city}, ${product.farmer.user.addresses[0].state}`
      : "Location not available";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <CustomerHeader />
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Store
        </Button>

        {/* Review Submission Success Message */}
        {reviewSubmitted && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <p>
                  Your review has been submitted and is awaiting admin approval.
                  Thank you!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
              {product.photos[0] ? (
                <Image
                  src={product.photos[0]}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gray-100">
                  <Package className="h-24 w-24 text-gray-400" />
                </div>
              )}
            </div>
            {product.photos.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.photos.slice(1, 5).map((photo, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square overflow-hidden rounded border"
                  >
                    <Image
                      src={photo}
                      alt={`${product.name} ${idx + 2}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <Badge className="mb-2">{product.category}</Badge>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(product.averageRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {product.averageRating.toFixed(1)} ({product.reviewCount}{" "}
                  reviews)
                </span>
              </div>
            </div>

            {/* Farmer Selection - Show if multiple farmers available */}
            {product.hasMultipleFarmers &&
              product.availableFarmers &&
              product.availableFarmers.length > 1 && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Select Farmer to Purchase From
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {product.availableFarmers.map((farmerOption) => {
                      const isSelected =
                        selectedFarmer?.productId === farmerOption.productId;
                      const selectedListing = farmerOption.listings[0]; // Use first listing as default

                      return (
                        <div
                          key={farmerOption.productId}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? "border-green-600 bg-green-100 shadow-md"
                              : "border-gray-200 bg-white hover:border-green-300"
                          }`}
                          onClick={() => {
                            setSelectedFarmer(farmerOption);
                            setSelectedListingId(selectedListing?.id || null);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">
                                  {farmerOption.farmer.name}
                                </span>
                                {farmerOption.farmer.verified && (
                                  <Badge
                                    variant="default"
                                    className="bg-green-600"
                                  >
                                    Verified
                                  </Badge>
                                )}
                                {isSelected && (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {farmerOption.farmer.location}
                              </p>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="font-semibold text-green-600">
                                  ₹{farmerOption.bestPrice.toFixed(2)}
                                </span>
                                <span className="text-gray-600">
                                  Stock: {selectedListing?.availableQty || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

            <div>
              <p className="text-3xl font-bold">
                ₹
                {(selectedFarmer
                  ? selectedFarmer.listings[0]?.price || product.price
                  : product.price
                ).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">
                per {product.baseUnit || "unit"}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-500" />
                <span>
                  Available:{" "}
                  {selectedFarmer
                    ? selectedFarmer.listings[0]?.availableQty ||
                      product.availableQty
                    : product.availableQty}{" "}
                  {product.baseUnit || "units"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-gray-500" />
                <span>
                  Expected delivery: {product.expectedDeliveryDays} days
                </span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <label className="font-medium">Quantity:</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const maxQty = selectedFarmer
                      ? selectedFarmer.listings[0]?.availableQty ||
                        product.availableQty
                      : product.availableQty;
                    setQuantity(Math.min(maxQty, quantity + 1));
                  }}
                >
                  +
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Total: ₹
                {(
                  (selectedFarmer
                    ? selectedFarmer.listings[0]?.price || product.price
                    : product.price) * quantity
                ).toFixed(2)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                onClick={handleAddToCart}
                disabled={
                  isAddingToCart ||
                  (selectedFarmer
                    ? (selectedFarmer.listings[0]?.availableQty ||
                        product.availableQty) === 0
                    : product.availableQty === 0)
                }
                className="flex-1"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {isAddingToCart ? "Adding..." : "Add to Cart"}
              </Button>
              <Button
                variant={product.isInWishlist ? "default" : "outline"}
                onClick={handleToggleWishlist}
                disabled={isTogglingWishlist}
              >
                <Heart
                  className={`h-4 w-4 ${
                    product.isInWishlist ? "fill-red-500" : ""
                  }`}
                />
              </Button>
            </div>

            {/* Farmer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sold by Farmer</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/customer/store/farmers/${product.farmer.user.email}`}
                  className="block space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">
                      {product.farmer.user.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {farmerLocation}
                    </span>
                  </div>
                  {product.farmerRating > 0 && (
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">
                        {product.farmerRating.toFixed(1)} (
                        {product.farmerReviewCount} reviews)
                      </span>
                    </div>
                  )}
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Description */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{product.description}</p>
            </CardContent>
          </Card>
        </div>

        {/* Reviews Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Customer Reviews ({product.reviewCount || 0})
                </CardTitle>
                {!showReviewForm && (
                  <Button onClick={() => setShowReviewForm(true)}>
                    Write a Review
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Review Form */}
              {showReviewForm && (
                <div className="mb-8 p-4 border rounded-lg bg-gray-50">
                  <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Rating *</Label>
                      <div className="flex gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-6 w-6 ${
                                star <= reviewRating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="comment">Comment</Label>
                      <Textarea
                        id="comment"
                        placeholder="Share your experience with this product..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={4}
                        className="mt-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSubmitReview}
                        disabled={isSubmittingReview || !reviewRating}
                      >
                        {isSubmittingReview ? "Submitting..." : "Submit Review"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowReviewForm(false);
                          setReviewRating(0);
                          setReviewComment("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing Reviews */}
              {product.reviews.length > 0 ? (
                <div className="space-y-4">
                  {product.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border-b pb-4 last:border-0"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-medium">
                          {review.author.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No reviews yet. Be the first to review this product!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
