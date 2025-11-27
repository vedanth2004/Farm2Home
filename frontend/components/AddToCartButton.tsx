"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, AlertCircle } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  image?: string;
  farmerName: string;
}

interface AddToCartButtonProps {
  product: Product;
}

interface StockInfo {
  availableStock: number;
  unit: string;
  price: number;
}

export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addItem, state } = useCart();
  const { data: session } = useSession();
  const router = useRouter();

  // Fetch stock information
  useEffect(() => {
    const fetchStock = async () => {
      try {
        const response = await fetch(`/api/products/${product.id}/stock`);
        if (response.ok) {
          const data = await response.json();
          setStockInfo(data);
        }
      } catch (error) {
        console.error("Error fetching stock:", error);
      }
    };

    fetchStock();
  }, [product.id]);

  // Check if item is already in cart
  const existingCartItem = state.items.find(
    (item) => item.productId === product.id,
  );
  const currentQuantity = existingCartItem?.quantity || 0;
  const availableStock = stockInfo?.availableStock || 0;
  const isOutOfStock = availableStock === 0;
  const isAtStockLimit = currentQuantity >= availableStock;

  const handleAddToCart = async () => {
    if (!session) {
      // Redirect to login if not authenticated
      router.push("/auth/signin?callbackUrl=/customer/store/products");
      return;
    }

    if (isOutOfStock) {
      setError("This product is out of stock");
      return;
    }

    if (isAtStockLimit) {
      setError(
        `Maximum ${availableStock} ${stockInfo?.unit || "items"} available`,
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Adding item to cart:", {
        productId: product.id,
        productName: product.name,
        price: stockInfo?.price || product.price,
        quantity: 1,
      });

      await addItem({
        productId: product.id,
        productName: product.name,
        price: stockInfo?.price || product.price,
        quantity: 1,
        unit: stockInfo?.unit || product.unit,
        image: product.image,
        farmerName: product.farmerName,
      });

      console.log("Item added to cart successfully");
      setIsAdded(true);

      // Reset the "Added" state after 2 seconds
      setTimeout(() => setIsAdded(false), 2000);
    } catch (error) {
      console.error("Error adding to cart:", error);
      setError("Failed to add item to cart");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handleAddToCart}
        disabled={isLoading || isOutOfStock || isAtStockLimit}
        className={`w-full ${
          isAdded
            ? "bg-green-600 hover:bg-green-700"
            : isOutOfStock || isAtStockLimit
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Adding...
          </div>
        ) : isAdded ? (
          <div className="flex items-center">
            <Check className="h-4 w-4 mr-2" />
            Added!
          </div>
        ) : isOutOfStock ? (
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Out of Stock
          </div>
        ) : isAtStockLimit ? (
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Max Quantity
          </div>
        ) : (
          <div className="flex items-center">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </div>
        )}
      </Button>

      {/* Stock information */}
      {stockInfo && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          {availableStock > 0 ? (
            <span>
              {availableStock} {stockInfo.unit} available
              {currentQuantity > 0 && (
                <span className="text-green-600 ml-1">
                  ({currentQuantity} in cart)
                </span>
              )}
            </span>
          ) : (
            <span className="text-red-600">Out of stock</span>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 text-sm text-red-600 text-center">{error}</div>
      )}
    </div>
  );
}
