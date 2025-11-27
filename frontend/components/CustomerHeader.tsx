"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Leaf,
  ShoppingCart,
  User,
  LogOut,
  Package,
  Home,
  HandHeart,
} from "lucide-react";
import CartIcon from "@/components/CartIcon";

export default function CustomerHeader() {
  const { data: session, status } = useSession();

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <div className="bg-green-600 p-2 rounded-xl mr-3">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Farm2Home</h1>
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link
              href="/customer/store/products"
              className="text-gray-700 hover:text-green-600 transition-colors font-medium"
            >
              Products
            </Link>
            <Link
              href="/customer/store/farmers"
              className="text-gray-700 hover:text-green-600 transition-colors font-medium"
            >
              Farmers
            </Link>
            <Link
              href="/customer/store/orders"
              className="text-gray-700 hover:text-green-600 transition-colors font-medium"
            >
              My Orders
            </Link>
            <Link
              href="/customer/store/approvals"
              className="text-gray-700 hover:text-green-600 transition-colors font-medium"
            >
              Delivery Confirmations
            </Link>
            <Link
              href="/customer/store/cart"
              className="text-gray-700 hover:text-green-600 transition-colors font-medium"
            >
              Cart
            </Link>
            <Link
              href="/customer/store"
              className="text-gray-700 hover:text-green-600 transition-colors font-medium"
            >
              Home
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <CartIcon />

            {status === "loading" ? (
              <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
            ) : session ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Welcome, {session.user?.name}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/auth/signin">
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
