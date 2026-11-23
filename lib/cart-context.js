"use client";

import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  cartCount: 0,
});

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Helper to sanitize any cart item that might contain oversized base64 data URLs
  const sanitizeCartItem = (item) => {
    if (!item) return item;
    let modified = false;

    // Sanitize images array
    let images = item.images;
    if (Array.isArray(images) && images.some(img => typeof img === "string" && img.startsWith("data:image/"))) {
      images = images.map(img => {
        if (typeof img === "string" && img.startsWith("data:image/")) {
          return item.artworkFiles?.[0]?.url || item.thumbnail || "";
        }
        return img;
      }).filter(Boolean);
      modified = true;
    }

    // Sanitize mockupSnapshots
    let mockupSnapshots = item.mockupSnapshots;
    if (mockupSnapshots && typeof mockupSnapshots === "object") {
      const cleaned = {};
      for (const [k, v] of Object.entries(mockupSnapshots)) {
        if (typeof v === "string" && v.startsWith("data:image/")) {
          cleaned[k] = item.artworkFiles?.[0]?.url || "";
          modified = true;
        } else {
          cleaned[k] = v;
        }
      }
      mockupSnapshots = cleaned;
    }

    if (modified) {
      return { ...item, images, mockupSnapshots };
    }
    return item;
  };

  // Load cart from localStorage on mount and sanitize
  useEffect(() => {
    try {
      const stored = localStorage.getItem("apex_cart");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCart(parsed.map(sanitizeCartItem));
        }
      }
    } catch (e) {
      console.error("Error loading cart:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage when changed
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("apex_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Error saving cart:", e);
    }
  }, [cart, isLoaded]);

  const addToCart = (item) => {
    const cleanItem = sanitizeCartItem(item);
    setCart((prev) => {
      // Check if exact same product with exact same options already exists
      const existingIdx = prev.findIndex(
        (i) =>
          i.productId === cleanItem.productId &&
          JSON.stringify(i.selectedOptionMap) === JSON.stringify(cleanItem.selectedOptionMap)
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += cleanItem.quantity || 1;
        return updated;
      }

      return [...prev, { ...cleanItem, id: crypto.randomUUID(), quantity: cleanItem.quantity || 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((acc, item) => acc + (item.quantity ? 1 : 0), 0); // Count items, not piece quantities, or count total pieces? Let's count items.

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
