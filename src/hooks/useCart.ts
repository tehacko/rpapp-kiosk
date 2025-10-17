import { useState, useCallback } from 'react';
import { Cart, Product } from 'pi-kiosk-shared';
import { createEmptyCart, addToCart, removeFromCart, updateCartItemQuantity } from 'pi-kiosk-shared';

export interface UseCartReturn {
  cart: Cart;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearAll: () => void;
  getItemQuantity: (productId: number) => number;
  isEmpty: boolean;
}

export const useCart = (): UseCartReturn => {
  const [cart, setCart] = useState<Cart>(createEmptyCart());

  const addItem = useCallback((product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      // Create a completely new cart object
      const newCart = {
        items: [...prevCart.items],
        totalItems: prevCart.totalItems,
        totalAmount: prevCart.totalAmount
      };
      
      addToCart(newCart, product, quantity);
      
      // Return a new object to ensure React detects the change
      return {
        items: [...newCart.items],
        totalItems: newCart.totalItems,
        totalAmount: newCart.totalAmount
      };
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      removeFromCart(newCart, productId);
      return newCart;
    });
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      updateCartItemQuantity(newCart, productId, quantity);
      return newCart;
    });
  }, []);

  const clearAll = useCallback(() => {
    setCart(createEmptyCart());
  }, []);

  const getItemQuantity = useCallback((productId: number) => {
    const item = cart.items.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  }, [cart.items]);

  const isEmpty = cart.items.length === 0;

  return {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearAll,
    getItemQuantity,
    isEmpty
  };
};
