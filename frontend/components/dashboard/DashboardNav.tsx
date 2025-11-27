"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Bell,
  MapPin,
  Truck,
  Clock,
  Search,
  FileText,
  Star,
  Brain,
} from "lucide-react";

interface DashboardNavProps {
  user: {
    id: string;
    internalId?: string;
    displayId?: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export default function DashboardNav({ user }: DashboardNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getNavItems = (role: UserRole) => {
    const baseItems = [{ href: "/dashboard", label: "Dashboard", icon: Home }];

    switch (role) {
      case UserRole.ADMIN:
        return [
          ...baseItems,
          { href: "/dashboard/admin/users", label: "Users", icon: Users },
          {
            href: "/dashboard/admin/approvals",
            label: "Approvals",
            icon: Clock,
          },
          {
            href: "/dashboard/admin/products",
            label: "Products",
            icon: Package,
          },
          {
            href: "/dashboard/admin/orders",
            label: "Orders",
            icon: ShoppingCart,
          },
          {
            href: "/dashboard/admin/analytics",
            label: "Analytics",
            icon: Settings,
          },
        ];
      case UserRole.FARMER:
        return [
          ...baseItems,
          {
            href: "/dashboard/farmer/products",
            label: "My Products",
            icon: Package,
          },
          {
            href: "/dashboard/farmer/orders",
            label: "Orders",
            icon: ShoppingCart,
          },
          {
            href: "/dashboard/farmer/reviews",
            label: "Reviews",
            icon: Star,
          },
          {
            href: "/dashboard/farmer/payouts",
            label: "Payouts",
            icon: Settings,
          },
        ];
      case UserRole.CR:
        return [
          ...baseItems,
          {
            href: "/dashboard/cr/deliveries",
            label: "Deliveries",
            icon: Truck,
          },
          { href: "/dashboard/cr/orders", label: "Orders", icon: ShoppingCart },
          { href: "/dashboard/cr/earnings", label: "Earnings", icon: Settings },
        ];
      case UserRole.PICKUP_AGENT:
        return [
          ...baseItems,
          {
            href: "/dashboard/agent/pickups",
            label: "Pickup Jobs",
            icon: Truck,
          },
          {
            href: "/dashboard/agent/earnings",
            label: "Earnings",
            icon: Settings,
          },
        ];
      case UserRole.CUSTOMER:
        return [
          ...baseItems,
          {
            href: "/dashboard/customer/orders",
            label: "My Orders",
            icon: ShoppingCart,
          },
          {
            href: "/dashboard/customer/notifications",
            label: "Notifications",
            icon: Bell,
          },
          {
            href: "/dashboard/customer/addresses",
            label: "Addresses",
            icon: MapPin,
          },
        ];
      default:
        return baseItems;
    }
  };

  const navItems = getNavItems(user.role);

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="text-xl font-bold text-green-600"
            >
              Farm2Home
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-2 text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            {user.role === "CUSTOMER" && (
              <Link href="/dashboard/customer/notifications">
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-4 w-4" />
                  {/* Notification badge will be added via client component */}
                </Button>
              </Link>
            )}
            {user.role !== "CUSTOMER" && (
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
            )}

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
              >
                {user.name}
              </Button>

              {isOpen && (
                <Card className="absolute right-0 mt-2 w-48 z-50">
                  <CardContent className="p-2">
                    <div className="px-3 py-2 text-sm text-gray-700 border-b">
                      <div className="font-medium">{user.name}</div>
                      {user.displayId && (
                        <div className="text-xs text-gray-500 font-mono">
                          {user.displayId}
                        </div>
                      )}
                      <div className="text-gray-500">{user.email}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start mt-2"
                      onClick={() => signOut()}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              Menu
            </Button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-2 text-gray-700 hover:text-green-600 block px-3 py-2 rounded-md text-base font-medium"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
