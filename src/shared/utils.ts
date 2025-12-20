// Kiosk app utility functions
import type { Cart, CartItem, KioskProduct } from 'pi-kiosk-shared';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Additional check for consecutive dots which are invalid
  if (email.includes('..')) return false;
  return emailRegex.test(email);
};

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
};

// Price precision handling utilities
export const PRICE_PRECISION = 2; // 2 decimal places for CZK

export const roundPrice = (price: number): number => {
  return Math.round(price * 100) / 100;
};

export const parsePrice = (value: string | number): number => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return roundPrice(num);
};

export const validatePrice = (price: number): boolean => {
  return !isNaN(price) && price > 0 && price <= 999999.99;
};

// Convert decimal to string for API calls to avoid precision issues
export const priceToString = (price: number): string => {
  return price.toFixed(PRICE_PRECISION);
};

// Convert string back to number for calculations
export const stringToPrice = (priceStr: string): number => {
  return parseFloat(priceStr);
};

export const getKioskIdFromUrl = (): number => {
  const urlParams = new URLSearchParams(window.location.search);
  const kioskId = urlParams.get('kioskId');
  
  if (!kioskId) {
    throw new Error('Kiosk ID is required. Please add ?kioskId=X to the URL where X is your kiosk number.');
  }
  
  const parsedId = parseInt(kioskId);
  if (isNaN(parsedId) || parsedId <= 0) {
    throw new Error(`Invalid kiosk ID: ${kioskId}. Kiosk ID must be a positive number.`);
  }
  
  return parsedId;
};

export const getKioskSecretFromUrl = (): string | undefined => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('secret') ?? undefined;
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('cs-CZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const generatePaymentId = (): string => {
  return `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const validateKioskId = (kioskId: number): boolean => {
  return Number.isInteger(kioskId) && kioskId > 0;
};

// Cart utility functions
export const createEmptyCart = (): Cart => ({
  items: [],
  totalAmount: 0,
  totalItems: 0
});

export const addToCart = (cart: Cart, product: KioskProduct, quantity = 1): Cart => {
  const existingItemIndex = cart.items.findIndex((item: CartItem) => item.product.id === product.id);
  
  // Create a new items array
  const newItems = [...cart.items];
  
  if (existingItemIndex !== -1) {
    // Create a new item object with updated quantity (immutable update)
    const existingItem = cart.items[existingItemIndex];
    newItems[existingItemIndex] = {
      ...existingItem,
      quantity: existingItem.quantity + quantity
    };
  } else {
    // Add new item to the array
    newItems.push({ product, quantity });
  }
  
  // Calculate totals
  const totalAmount = roundPrice(newItems.reduce((sum: number, item: CartItem) => sum + (item.product.price * item.quantity), 0));
  const totalItems = newItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
  
  // Return a new cart object (immutable)
  return {
    ...cart,
    items: newItems,
    totalAmount,
    totalItems
  };
};

export const removeFromCart = (cart: Cart, productId: number): Cart => {
  // Create a new items array (immutable)
  const newItems = cart.items.filter((item: CartItem) => item.product.id !== productId);
  
  // Calculate totals
  const totalAmount = roundPrice(newItems.reduce((sum: number, item: CartItem) => sum + (item.product.price * item.quantity), 0));
  const totalItems = newItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
  
  // Return a new cart object (immutable)
  return {
    ...cart,
    items: newItems,
    totalAmount,
    totalItems
  };
};

export const updateCartItemQuantity = (cart: Cart, productId: number, quantity: number): Cart => {
  if (quantity <= 0) {
    return removeFromCart(cart, productId);
  }
  
  const itemIndex = cart.items.findIndex((item: CartItem) => item.product.id === productId);
  if (itemIndex === -1) {
    return cart;
  }
  
  // Create a new items array with updated item (immutable)
  const newItems = [...cart.items];
  const existingItem = cart.items[itemIndex];
  newItems[itemIndex] = {
    ...existingItem,
    quantity
  };
  
  // Calculate totals
  const totalAmount = roundPrice(newItems.reduce((sum: number, item: CartItem) => sum + (item.product.price * item.quantity), 0));
  const totalItems = newItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
  
  // Return a new cart object (immutable)
  return {
    ...cart,
    items: newItems,
    totalAmount,
    totalItems
  };
};

export const clearCart = (cart: Cart): Cart => {
  // Return a new cart object (immutable)
  return {
    ...cart,
    items: [],
    totalAmount: 0,
    totalItems: 0
  };
};

