import React, { createContext, useContext, useState, useCallback } from "react";
import type { CartItem, Product, SelectedAddon } from "@/data/menuData";

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, addons: SelectedAddon[], notes: string) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, addons: SelectedAddon[], notes: string) => {
    setItems((prev) => [...prev, { product, quantity: 1, selectedAddons: addons, notes }]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, quantity } : item)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, item) => {
    const pPrice = Number(item.product.price) || 0;
    const itemQty = Number(item.quantity) || 0;
    
    const addonTotal = item.selectedAddons.reduce((s, sa) => {
      const aPrice = Number(sa.addon.price) || 0;
      const aQty = Number(sa.quantity) || 0;
      return s + (aPrice * aQty);
    }, 0);
    
    return sum + ((pPrice + addonTotal) * itemQty);
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
