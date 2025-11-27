"use client";

import { useCart } from "@/contexts/CartContext";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CartIcon() {
  const { state } = useCart();

  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/customer/store/cart" className="relative">
        <ShoppingCart className="h-4 w-4" />
        {state.itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {state.itemCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
