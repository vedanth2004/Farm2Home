"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CustomerHeader from "@/components/CustomerHeader";
import {
  ArrowLeft,
  CreditCard,
  MapPin,
  User,
  Phone,
  Mail,
  Banknote,
  Tag,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { state, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">(
    "razorpay",
  );
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
    notes: "",
  });

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin?callbackUrl=/customer/store/checkout");
      return;
    }

    // Only redirect to cart if not currently processing an order
    if (state.items.length === 0 && !loading) {
      router.push("/customer/store/cart");
      return;
    }

    // Pre-fill form with user data
    if (session.user) {
      setFormData((prev) => ({
        ...prev,
        name: session.user?.name || "",
        email: session.user?.email || "",
      }));
    }
  }, [session, status, router, state.items.length, loading]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setValidatingCoupon(true);
    setCouponError("");

    try {
      const response = await fetch(
        `/api/coupons?code=${couponCode.toUpperCase()}`,
      );
      const result = await response.json();

      if (result.success) {
        const coupon = result.data;
        const subtotal = state.total;

        // Check minimum purchase requirement
        if (coupon.minPurchase && subtotal < Number(coupon.minPurchase)) {
          setCouponError(`Minimum purchase of ₹${coupon.minPurchase} required`);
          return;
        }

        // Calculate discount
        let discount = (subtotal * Number(coupon.discountPercent)) / 100;

        // Apply max discount limit if set
        if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
          discount = Number(coupon.maxDiscount);
        }

        setAppliedCoupon(coupon);
        setDiscountAmount(discount);
        setCouponError("");
      } else {
        setCouponError(result.error || "Invalid coupon code");
        setAppliedCoupon(null);
        setDiscountAmount(0);
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      setCouponError("Failed to validate coupon. Please try again.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponError("");
  };

  const getFinalTotal = () => {
    return Math.max(0, state.total - discountAmount);
  };

  const handleCheckout = async () => {
    if (!session) return;

    setLoading(true);

    try {
      console.log("Starting checkout process...");
      console.log("Cart items:", state.items);
      console.log("Total amount:", state.total);
      console.log("Payment method:", paymentMethod);

      const finalTotal = getFinalTotal();

      const orderData = {
        items: state.items,
        totalAmount: finalTotal,
        discountAmount: discountAmount,
        couponCode: appliedCoupon?.code || null,
        paymentMethod: paymentMethod,
        customerId: session.user.id,
        shippingAddress: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          notes: formData.notes,
        },
      };

      console.log("Order data:", orderData);

      if (paymentMethod === "cod") {
        // Handle Cash on Delivery
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderData),
        });

        if (response.ok) {
          const orderResult = await response.json();
          console.log("COD order created:", orderResult);

          // Clear cart and redirect to success page
          clearCart();
          router.push(`/customer/store/orders/${orderResult.orderId}`);
        } else {
          const errorData = await response.json();
          console.error("COD order creation failed:", errorData);
          throw new Error(errorData.error || "Failed to create COD order");
        }
      } else {
        // Handle Razorpay payment
        const response = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderData),
        });

        if (response.ok) {
          const paymentData = await response.json();
          console.log("Payment order created:", paymentData);

          // Initialize Razorpay
          const options = {
            key: paymentData.key,
            amount: paymentData.amount * 100, // Convert to paise
            currency: paymentData.currency,
            name: "Farm2Home",
            description: "Fresh produce",
            order_id: paymentData.razorpayOrderId,
            handler: async function (response: any) {
              console.log("Payment success:", response);

              // Verify payment
              const verifyResponse = await fetch("/api/payments/verify", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  orderId: paymentData.orderId,
                  razorpayOrderId: paymentData.razorpayOrderId,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });

              if (verifyResponse.ok) {
                // Clear cart and redirect to success page
                clearCart();
                router.push(`/customer/store/orders/${paymentData.orderId}`);
              } else {
                alert("Payment verification failed. Please contact support.");
              }
            },
            prefill: {
              name: formData.name,
              email: formData.email,
              contact: formData.phone,
            },
            notes: {
              address: formData.address,
              city: formData.city,
              pincode: formData.pincode,
            },
            theme: {
              color: "#10b981",
            },
          };

          const razorpay = new (window as any).Razorpay(options);

          razorpay.on("payment.failed", function (response: any) {
            console.error("Payment failed:", response.error);
            alert(`Payment failed: ${response.error.description}`);
            setLoading(false);
          });

          razorpay.on("payment.cancelled", function () {
            console.log("Payment cancelled by user");
            setLoading(false);
          });

          razorpay.open();
        } else {
          const errorData = await response.json();
          console.error("Payment order creation failed:", errorData);
          throw new Error(errorData.error || "Failed to create payment order");
        }
      }
    } catch (error) {
      console.error("Checkout error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Checkout failed. Please try again.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <CustomerHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!session || state.items.length === 0) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <CustomerHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button variant="outline" asChild>
            <Link href="/customer/store/cart">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cart
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600">Complete your order</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Any special instructions for delivery..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Coupon Code */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="h-5 w-5 mr-2" />
                  Apply Coupon
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!appliedCoupon ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError("");
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleApplyCoupon();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                    >
                      {validatingCoupon ? "Applying..." : "Apply"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">
                        {appliedCoupon.code} applied -{" "}
                        {appliedCoupon.discountPercent}% off
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCoupon}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {couponError && (
                  <p className="mt-2 text-sm text-red-600">{couponError}</p>
                )}
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Razorpay Option */}
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        paymentMethod === "razorpay"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setPaymentMethod("razorpay")}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            paymentMethod === "razorpay"
                              ? "border-green-500 bg-green-500"
                              : "border-gray-300"
                          }`}
                        >
                          {paymentMethod === "razorpay" && (
                            <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                          )}
                        </div>
                        <CreditCard className="h-5 w-5 text-gray-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">
                            Online Payment
                          </h3>
                          <p className="text-sm text-gray-600">
                            Pay securely with Razorpay
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cash on Delivery Option */}
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        paymentMethod === "cod"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setPaymentMethod("cod")}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            paymentMethod === "cod"
                              ? "border-green-500 bg-green-500"
                              : "border-gray-300"
                          }`}
                        >
                          {paymentMethod === "cod" && (
                            <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                          )}
                        </div>
                        <Banknote className="h-5 w-5 text-gray-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">
                            Cash on Delivery
                          </h3>
                          <p className="text-sm text-gray-600">
                            Pay when your order arrives
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {paymentMethod === "cod" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-white text-xs">i</span>
                        </div>
                        <div className="text-sm text-blue-700">
                          <strong>Cash on Delivery:</strong> Your order will be
                          assigned to a pickup agent who will collect payment
                          upon delivery. Please keep exact change ready.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {state.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.productName}
                            width={48}
                            height={48}
                            className="object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-green-400 rounded"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {item.productName}
                        </p>
                        <p className="text-xs text-gray-600">
                          by {item.farmerName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        ₹{(Number(item.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>₹{Number(state.total).toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>₹{getFinalTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={
                    loading ||
                    !formData.name ||
                    !formData.email ||
                    !formData.phone ||
                    !formData.address ||
                    !formData.city ||
                    !formData.pincode
                  }
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      {paymentMethod === "cod" ? (
                        <Banknote className="h-5 w-5 mr-2" />
                      ) : (
                        <CreditCard className="h-5 w-5 mr-2" />
                      )}
                      {paymentMethod === "cod"
                        ? "Place COD Order"
                        : "Pay with Razorpay"}
                    </div>
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    {paymentMethod === "cod"
                      ? "Payment will be collected upon delivery"
                      : "Secure payment with Razorpay"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
