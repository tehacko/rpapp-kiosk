// Jest setup for React Testing Library
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure React Testing Library for React 18
configure({
  asyncUtilTimeout: 5000,
  // React 18's automatic batching support
  reactStrictMode: true,
});

// Mock environment variables for tests
process.env.REACT_APP_API_URL = 'http://localhost:3015';
process.env.REACT_APP_WS_URL = 'ws://localhost:3015';
process.env.NODE_ENV = 'test';

// Mock getEnvironmentConfig
jest.mock('pi-kiosk-shared', () => ({
  ...jest.requireActual('pi-kiosk-shared'),
  getEnvironmentConfig: jest.fn(() => ({
    apiUrl: 'http://localhost:3015',
    wsUrl: 'ws://localhost:3015'
  }))
}));

// Mock window.location for URL parsing tests
Object.defineProperty(window, 'location', {
  value: {
    search: '?kioskId=1',
    href: 'http://localhost:3000/?kioskId=1'
  },
  writable: true
});

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  send: jest.fn(),
  readyState: 1, // OPEN
})) as any;

// Add the missing constants
(global.WebSocket as any).CONNECTING = 0;
(global.WebSocket as any).OPEN = 1;
(global.WebSocket as any).CLOSING = 2;
(global.WebSocket as any).CLOSED = 3;

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code')
}));

// Mock fullscreen API
Object.defineProperty(document.documentElement, 'requestFullscreen', {
  value: jest.fn().mockResolvedValue(undefined),
  writable: true
});

Object.defineProperty(document, 'exitFullscreen', {
  value: jest.fn().mockResolvedValue(undefined),
  writable: true
});

Object.defineProperty(document, 'fullscreenElement', {
  value: null,
  writable: true
});

// Suppress React act() warnings in tests
const originalError = console.error;
console.error = function(...args: any[]) {
  if (typeof args[0] === 'string' && args[0].includes('Warning: An update to')) {
    return;
  }
  originalError.apply(console, args);
};
