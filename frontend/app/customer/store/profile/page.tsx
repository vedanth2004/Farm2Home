"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CustomerHeader from "@/components/CustomerHeader";
import {
  User,
  MapPin,
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  Building,
  CheckCircle,
  ShoppingCart,
  Package,
} from "lucide-react";
import Link from "next/link";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
  twoFactorEnabled: boolean;
  addresses: {
    id: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }[];
}

export default function CustomerProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin?callbackUrl=/customer/store/profile");
      return;
    }

    fetchUserData();
  }, [session, status, router]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUserData(result.data);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <CustomerHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!session || !userData) {
    return null; // Will redirect
  }

  const primaryAddress = userData.addresses[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <CustomerHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="outline" asChild>
              <Link href="/customer/store">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Store
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-600">
                View and manage your customer profile information
              </p>
            </div>
          </div>
          <Button className="bg-green-600 hover:bg-green-700">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Full Name
                  </label>
                  <p className="text-sm font-medium text-gray-900">
                    {userData.name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Phone
                  </label>
                  <p className="text-sm font-medium text-gray-900 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    {userData.phone || "Not provided"}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Email
                </label>
                <p className="text-sm font-medium text-gray-900 flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  {userData.email}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Language
                </label>
                <p className="text-sm font-medium text-gray-900">
                  {userData.locale.toUpperCase()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Location Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {primaryAddress ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Address
                    </label>
                    <p className="text-sm font-medium text-gray-900">
                      {primaryAddress.line1}
                    </p>
                    {primaryAddress.line2 && (
                      <p className="text-sm font-medium text-gray-900">
                        {primaryAddress.line2}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        City
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {primaryAddress.city}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        State
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {primaryAddress.state}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Pincode
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {primaryAddress.postalCode}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Country
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {primaryAddress.country}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">
                  No address information available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Role
                </label>
                <p className="text-sm font-medium text-gray-900">Customer</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Account Created
                </label>
                <p className="text-sm font-medium text-gray-900">
                  {new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date(userData.createdAt))}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Last Updated
                </label>
                <p className="text-sm font-medium text-gray-900">
                  {new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date(userData.updatedAt))}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Two-Factor Authentication
                </label>
                <div className="flex items-center">
                  <Badge
                    className={
                      userData.twoFactorEnabled
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {userData.twoFactorEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" asChild className="h-20 flex-col">
                  <Link href="/customer/store/orders">
                    <Package className="h-6 w-6 mb-2" />
                    My Orders
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-20 flex-col">
                  <Link href="/customer/store/cart">
                    <ShoppingCart className="h-6 w-6 mb-2" />
                    My Cart
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-20 flex-col">
                  <Link href="/customer/store/feedback">
                    <CheckCircle className="h-6 w-6 mb-2" />
                    Feedback
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-20 flex-col">
                  <Link href="/customer/store/products">
                    <Package className="h-6 w-6 mb-2" />
                    Browse Products
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
