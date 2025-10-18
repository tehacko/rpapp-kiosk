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
  totalItems: number;
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
      
      // Use the returned cart from addToCart
      const updatedCart = addToCart(newCart, product, quantity);
      
      // Return the updated cart
      return updatedCart;
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      const updatedCart = removeFromCart(newCart, productId);
      return updatedCart;
    });
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      const updatedCart = updateCartItemQuantity(newCart, productId, quantity);
      return updatedCart;
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
  const totalItems = cart.totalItems;

  return {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearAll,
    getItemQuantity,
    isEmpty,
    totalItems
  };
};
