"use client";

import { useState } from "react";
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
  CheckCircle,
  MapPin,
  Star,
  Heart,
} from "lucide-react";

const roles = [
  {
    id: "CUSTOMER",
    title: "Customer",
    description: "Browse and order fresh produce",
    icon: User,
    color: "bg-blue-500",
    features: [
      "Browse fresh produce",
      "Place orders online",
      "Track deliveries",
      "Leave reviews",
    ],
    benefits: "Get fresh produce delivered to your door",
  },
  {
    id: "FARMER",
    title: "Farmer",
    description: "Sell your fresh produce directly",
    icon: Leaf,
    color: "bg-green-500",
    features: [
      "List your products",
      "Manage inventory",
      "Track earnings",
      "Direct customer connection",
    ],
    benefits: "Connect directly with customers and earn more",
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
      "Flexible schedule",
    ],
    benefits: "Earn by helping with the supply chain",
  },
  {
    id: "CR",
    title: "Community Representative",
    description: "Manage local deliveries",
    icon: Users,
    color: "bg-purple-500",
    features: [
      "Manage local deliveries",
      "Coordinate with agents",
      "Track performance",
      "Earn commissions",
    ],
    benefits: "Be the local face of Farm2Home",
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
      "Analytics & reports",
      "System configuration",
    ],
    benefits: "Oversee the entire platform",
  },
];

export default function RoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const router = useRouter();

  const handleContinue = () => {
    if (selectedRole) {
      // Redirect to role-specific signup pages
      const roleRoutes: Record<string, string> = {
        FARMER: "/auth/farmer",
        CUSTOMER: "/auth/signup/customer",
        PICKUP_AGENT: "/auth/signup/agent",
        CR: "/auth/signup/cr",
        ADMIN: "/auth/signup/admin",
      };

      const route =
        roleRoutes[selectedRole] || `/auth/signup?role=${selectedRole}`;
      router.push(route);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-green-600 p-3 rounded-2xl mr-4">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Join Farm2Home</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Choose Your Role
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Select how you&apos;d like to participate in our farm-to-door
            ecosystem. Each role has unique benefits and responsibilities.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;

            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected
                    ? "ring-2 ring-green-500 shadow-lg transform scale-105"
                    : "hover:shadow-md"
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className={`p-3 rounded-xl ${role.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {role.title}
                  </CardTitle>
                  <p className="text-gray-600 text-sm">{role.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      What you can do:
                    </div>
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

                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Benefit:
                    </div>
                    <div className="text-sm text-gray-600">{role.benefits}</div>
                  </div>

                  {isSelected && (
                    <div className="mt-4 flex items-center justify-center">
                      <div className="flex items-center text-green-600 font-medium">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Selected
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Special Note for Farmers */}
        {selectedRole === "FARMER" && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-green-800 mb-2">
                    Location-Based Assignment
                  </h3>
                  <p className="text-green-700 text-sm">
                    When you sign up as a farmer, we&apos;ll automatically
                    assign you a Community Representative and Pickup Agent based
                    on your location. This ensures efficient coordination and
                    delivery in your area.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedRole}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-medium"
          >
            {selectedRole ? (
              <div className="flex items-center">
                Continue as {roles.find((r) => r.id === selectedRole)?.title}
                <ArrowRight className="ml-2 h-5 w-5" />
              </div>
            ) : (
              "Select a Role to Continue"
            )}
          </Button>

          <Link
            href="/auth/signin"
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            Already have an account? Sign in
          </Link>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-gray-600">
                Trusted by 1000+ users
              </span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600">Secure & reliable</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Heart className="h-5 w-5 text-red-500" />
              <span className="text-sm text-gray-600">Community focused</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
