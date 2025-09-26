// Jest setup for React Testing Library
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure React Testing Library for React 18
configure({
  asyncUtilTimeout: 5000,
  // React 18's automatic batching support
  reactStrictMode: true,
});

// Suppress React 18 act warnings in tests - React Testing Library handles this automatically
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: An update to') &&
      args[0].includes('was not wrapped in act')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock environment variables for tests
process.env.REACT_APP_API_URL = 'http://localhost:3015';
process.env.REACT_APP_WS_URL = 'ws://localhost:3015';
process.env.NODE_ENV = 'test';

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

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code')
}));
