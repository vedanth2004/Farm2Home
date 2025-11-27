"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  User,
  Leaf,
  Truck,
  Users,
  Shield,
  ArrowRight,
  Heart,
  Star,
  CheckCircle,
  MapPin,
  ShoppingCart,
} from "lucide-react";

const roles = [
  {
    id: "CUSTOMER",
    title: "Customer",
    description: "Browse and order fresh produce",
    icon: User,
    color: "bg-blue-500",
    features: [
      "Browse products",
      "Place orders",
      "Track deliveries",
      "Leave reviews",
    ],
    signupHref: "/auth/signup/customer",
    signinHref: "/auth/signin/customer",
  },
  {
    id: "FARMER",
    title: "Farmer",
    description: "Sell your fresh produce directly",
    icon: Leaf,
    color: "bg-green-500",
    features: [
      "List products",
      "Manage inventory",
      "Track earnings",
      "Direct sales",
    ],
    signupHref: "/auth/signup/farmer",
    signinHref: "/auth/signin/farmer",
  },
  {
    id: "PICKUP_AGENT",
    title: "Pickup Agent",
    description: "Help with pickup and delivery",
    icon: Truck,
    color: "bg-orange-500",
    features: [
      "Pickup from farmers",
      "Coordinate deliveries",
      "Track earnings",
      "Flexible work",
    ],
    signupHref: "/auth/signup/agent",
    signinHref: "/auth/signin/agent",
  },
  {
    id: "CR",
    title: "Community Representative",
    description: "Manage local deliveries",
    icon: Users,
    color: "bg-purple-500",
    features: [
      "Manage deliveries",
      "Coordinate with agents",
      "Track performance",
      "Earn commissions",
    ],
    signupHref: "/auth/signup/cr",
    signinHref: "/auth/signin/cr",
  },
  {
    id: "ADMIN",
    title: "Admin",
    description: "Manage the platform",
    icon: Shield,
    color: "bg-red-500",
    features: [
      "Platform management",
      "User oversight",
      "Analytics",
      "System config",
    ],
    signupHref: "/auth/signup/admin",
    signinHref: "/auth/signin/admin",
  },
];

export default function AuthLandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-green-600 p-2 rounded-xl mr-3">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Farm2Home</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/signin/admin">Admin</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/signin/farmer">Farmer</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/signin/customer">Customer</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/signin/agent">Agent</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/signin/cr">CR</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
            Join the Farm2Home
            <span className="text-green-600"> Community</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Connect with local farmers, enjoy fresh produce, and be part of a
            sustainable food ecosystem. Choose your role and start your journey
            today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
              onClick={() => router.push("/auth/role-selection")}
            >
              Choose Your Role
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50 px-8 py-3"
              onClick={() => router.push("/auth/signin")}
            >
              General Sign In
            </Button>
          </div>

          {/* Individual Role Buttons */}
          <div className="mt-8">
            <p className="text-lg text-green-100 mb-4">
              Or sign in directly as:
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => router.push("/auth/signin/admin")}
              >
                Admin
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => router.push("/auth/signin/farmer")}
              >
                Farmer
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => router.push("/auth/signin/customer")}
              >
                Customer
              </Button>
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => router.push("/auth/signin/agent")}
              >
                Agent
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => router.push("/auth/signin/cr")}
              >
                CR
              </Button>
            </div>
          </div>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.id}
                className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg"
              >
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center mb-4">
                    <div
                      className={`p-4 rounded-xl ${role.color} text-white group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="h-8 w-8" />
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {role.title}
                  </CardTitle>
                  <p className="text-gray-600">{role.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {role.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center text-sm text-gray-600"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 space-y-2">
                    <Button
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 group-hover:bg-green-600 group-hover:text-white transition-colors"
                      variant="outline"
                      onClick={() => router.push(role.signupHref)}
                    >
                      Sign Up
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      className="w-full bg-white hover:bg-gray-50 text-gray-600 border border-gray-300"
                      variant="outline"
                      onClick={() => router.push(role.signinHref)}
                    >
                      Sign In
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Individual Login/Signup Buttons */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Quick Access
            </h2>
            <p className="text-lg text-gray-600">
              Direct access to login and signup for each user type
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Admin */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-red-600 p-2 rounded-lg mr-3">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Admin</h3>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => router.push("/auth/signin/admin")}
                >
                  Admin Login
                </Button>
                <Button
                  className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-300"
                  variant="outline"
                  onClick={() => router.push("/auth/signup/admin")}
                >
                  Admin Signup
                </Button>
              </div>
            </div>

            {/* Farmer */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-green-600 p-2 rounded-lg mr-3">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Farmer</h3>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => router.push("/auth/signin/farmer")}
                >
                  Farmer Login
                </Button>
                <Button
                  className="w-full bg-white hover:bg-green-50 text-green-600 border border-green-300"
                  variant="outline"
                  onClick={() => router.push("/auth/signup/farmer")}
                >
                  Farmer Signup
                </Button>
              </div>
            </div>

            {/* Customer */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-600 p-2 rounded-lg mr-3">
                  <User className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Customer</h3>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => router.push("/auth/signin/customer")}
                >
                  Customer Login
                </Button>
                <Button
                  className="w-full bg-white hover:bg-blue-50 text-blue-600 border border-blue-300"
                  variant="outline"
                  onClick={() => router.push("/auth/signup/customer")}
                >
                  Customer Signup
                </Button>
              </div>
            </div>

            {/* Pickup Agent */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-orange-600 p-2 rounded-lg mr-3">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Pickup Agent
                </h3>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => router.push("/auth/signin/agent")}
                >
                  Agent Login
                </Button>
                <Button
                  className="w-full bg-white hover:bg-orange-50 text-orange-600 border border-orange-300"
                  variant="outline"
                  onClick={() => router.push("/auth/signup/agent")}
                >
                  Agent Signup
                </Button>
              </div>
            </div>

            {/* Community Representative */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-purple-600 p-2 rounded-lg mr-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Community Rep
                </h3>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => router.push("/auth/signin/cr")}
                >
                  CR Login
                </Button>
                <Button
                  className="w-full bg-white hover:bg-purple-50 text-purple-600 border border-purple-300"
                  variant="outline"
                  onClick={() => router.push("/auth/signup/cr")}
                >
                  CR Signup
                </Button>
              </div>
            </div>

            {/* All Roles Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-gray-600 p-2 rounded-lg mr-3">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">All Roles</h3>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                  onClick={() => router.push("/auth/signin")}
                >
                  General Login
                </Button>
                <Button
                  className="w-full bg-white hover:bg-gray-50 text-gray-600 border border-gray-300"
                  variant="outline"
                  onClick={() => router.push("/auth/role-selection")}
                >
                  Role Selection
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Farm2Home?
            </h2>
            <p className="text-lg text-gray-600">
              We&apos;re building a sustainable food ecosystem that benefits
              everyone
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Fresh from Farm
              </h3>
              <p className="text-gray-600">
                Direct connection with local farmers ensures the freshest
                produce reaches your table.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Location-Based Service
              </h3>
              <p className="text-gray-600">
                Smart assignment of Community Representatives and Pickup Agents
                based on your location.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Community Focused
              </h3>
              <p className="text-gray-600">
                Building a sustainable ecosystem that benefits farmers,
                customers, and local communities.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">1000+</div>
            <div className="text-gray-600">Happy Customers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">500+</div>
            <div className="text-gray-600">Local Farmers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">50+</div>
            <div className="text-gray-600">Service Areas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">4.9★</div>
            <div className="text-gray-600">Average Rating</div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of users who are already part of our community
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-green-600 hover:bg-gray-100 px-8 py-3"
              onClick={() => router.push("/auth/role-selection")}
            >
              Choose Your Role
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-green-600 px-8 py-3"
              onClick={() => router.push("/store")}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Browse Products
            </Button>
          </div>

          {/* Individual Role Signup Buttons */}
          <div className="mt-8">
            <p className="text-lg text-green-100 mb-4">
              Or sign up directly as:
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => router.push("/auth/signup/admin")}
              >
                Admin Signup
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => router.push("/auth/signup/farmer")}
              >
                Farmer Signup
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => router.push("/auth/signup/customer")}
              >
                Customer Signup
              </Button>
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => router.push("/auth/signup/agent")}
              >
                Agent Signup
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => router.push("/auth/signup/cr")}
              >
                CR Signup
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
