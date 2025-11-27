"use client";

import { createContext, useContext, useReducer, useEffect } from "react";
import { useSession } from "next-auth/react";

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  unit: string;
  image?: string;
  farmerName: string;
  availableStock: number;
  listingId?: string | null;
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  loading: boolean;
  error: string | null;
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

const initialState: CartState = {
  items: [],
  total: 0,
  itemCount: 0,
  loading: false,
  error: null,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id,
      );

      if (existingItem) {
        const updatedItems = state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item,
        );
        return {
          ...state,
          items: updatedItems,
          total: updatedItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0,
          ),
          itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
        };
      } else {
        const newItems = [...state.items, action.payload];
        return {
          ...state,
          items: newItems,
          total: newItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0,
          ),
          itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
        };
      }
    }

    case "REMOVE_ITEM": {
      const updatedItems = state.items.filter(
        (item) => item.id !== action.payload,
      );
      return {
        ...state,
        items: updatedItems,
        total: updatedItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
      };
    }

    case "UPDATE_QUANTITY": {
      const updatedItems = state.items
        .map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item,
        )
        .filter((item) => item.quantity > 0);

      return {
        ...state,
        items: updatedItems,
        total: updatedItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
      };
    }

    case "CLEAR_CART":
      return initialState;

    case "LOAD_CART":
      return {
        ...state,
        items: action.payload,
        total: action.payload.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        itemCount: action.payload.reduce((sum, item) => sum + item.quantity, 0),
      };

    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
      };

    default:
      return state;
  }
}

const CartContext = createContext<{
  state: CartState;
  addItem: (item: Omit<CartItem, "id" | "availableStock">) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  loadCart: () => Promise<void>;
} | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { data: session, status } = useSession();

  // Load cart from database when user is authenticated
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      loadCart();
    } else if (status === "unauthenticated") {
      // Clear cart when user logs out
      dispatch({ type: "CLEAR_CART" });
    }
  }, [session, status]);

  const loadCart = async () => {
    if (!session?.user?.id) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const response = await fetch("/api/cart");
      if (response.ok) {
        const cartData = await response.json();
        dispatch({ type: "LOAD_CART", payload: cartData.items });
      } else {
        const errorData = await response.json();
        dispatch({
          type: "SET_ERROR",
          payload: errorData.error || "Failed to load cart",
        });
      }
    } catch (error) {
      console.error("Error loading cart:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to load cart" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const addItem = async (item: Omit<CartItem, "id" | "availableStock">) => {
    if (!session?.user?.id) {
      dispatch({
        type: "SET_ERROR",
        payload: "Please log in to add items to cart",
      });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: item.productId,
          quantity: item.quantity,
        }),
      });

      if (response.ok) {
        console.log("Cart API response successful");
        // Reload cart to get updated data
        await loadCart();
      } else {
        const errorData = await response.json();
        console.error("Cart API error:", errorData);
        dispatch({
          type: "SET_ERROR",
          payload: errorData.error || "Failed to add item to cart",
        });
      }
    } catch (error) {
      console.error("Error adding item to cart:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to add item to cart" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const removeItem = async (productId: string) => {
    if (!session?.user?.id) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      });

      if (response.ok) {
        // Reload cart to get updated data
        await loadCart();
      } else {
        const errorData = await response.json();
        dispatch({
          type: "SET_ERROR",
          payload: errorData.error || "Failed to remove item from cart",
        });
      }
    } catch (error) {
      console.error("Error removing item from cart:", error);
      dispatch({
        type: "SET_ERROR",
        payload: "Failed to remove item from cart",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!session?.user?.id) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const response = await fetch("/api/cart", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId, quantity }),
      });

      if (response.ok) {
        // Reload cart to get updated data
        await loadCart();
      } else {
        const errorData = await response.json();
        dispatch({
          type: "SET_ERROR",
          payload: errorData.error || "Failed to update cart item",
        });
      }
    } catch (error) {
      console.error("Error updating cart item:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to update cart item" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const clearCart = async () => {
    if (!session?.user?.id) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      // Remove all items from cart
      for (const item of state.items) {
        await fetch("/api/cart", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ productId: item.productId }),
        });
      }

      dispatch({ type: "CLEAR_CART" });
    } catch (error) {
      console.error("Error clearing cart:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to clear cart" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        loadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
