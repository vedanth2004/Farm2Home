"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Leaf, ShoppingCart, User, Search } from "lucide-react";

export default function PublicStoreHeader() {
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
              href="/"
              className="text-gray-700 hover:text-green-600 transition-colors font-medium"
            >
              Home
            </Link>
            <Link
              href="/store/products"
              className="text-gray-700 hover:text-green-600 transition-colors font-medium"
            >
              Products
            </Link>
            <Link
              href="/#about"
              className="text-gray-700 hover:text-green-600 transition-colors font-medium"
            >
              About
            </Link>
            <Link
              href="/#contact"
              className="text-gray-700 hover:text-green-600 transition-colors font-medium"
            >
              Contact
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/auth/signup">
                  <User className="h-4 w-4 mr-2" />
                  Sign Up
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Link href="/auth/signin" className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
