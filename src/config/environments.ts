// Kiosk app environment configuration

export type Environment = 'development' | 'production';

export interface EnvironmentConfig {
  // API Configuration
  apiUrl: string;
  wsUrl: string;
  
  // Payment Configuration
  enableMockPayments: boolean;
  paymentAccountNumber: string;
  paymentMode: 'mock' | 'sandbox' | 'production';
  
  // UI Configuration
  showDebugInfo: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Service URLs (for cross-service communication)
  kioskUrl: string;
  adminUrl: string;
  backendUrl: string;
  
  // SSE Health Check Configuration
  sseHealthCheckInitialInterval: number;
  sseHealthCheckBackoffMultiplier: number;
  sseHealthCheckMaxInterval: number;
  sseHealthCheckMaxAttempts: number;
  sseHealthCheckMaxTotalTime: number;
}

// Simplified environment variable helper
function getEnvVar(key: string, defaultValue: string): string {
  // Check for process.env (Node.js environment)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] ?? defaultValue;
  }
  
  // Check for import.meta.env (Vite environment)
  if (typeof window !== 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta = (globalThis as any).import?.meta;
      if (meta?.env) {
        return meta.env[key] ?? defaultValue;
      }
    } catch {
      // Fallback for test environments
    }
  }
  
  return defaultValue;
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = getEnvVar(key, defaultValue.toString());
  return value === 'true';
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = getEnvVar(key, defaultValue.toString());
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Centralized service URLs configuration
const SERVICE_URLS = {
  development: {
    backend: 'http://localhost:3015',
    kiosk: 'http://localhost:3000',
    admin: 'http://localhost:3001',
  },
  production: {
    backend: 'https://rpapp-bckend-production.up.railway.app',
    kiosk: 'https://rpapp-kiosk-production.up.railway.app',
    admin: 'https://extraordinary-healing-production-88f4.up.railway.app',
  }
} as const;

// Get environment configuration dynamically
function getConfigForEnvironment(env: Environment): EnvironmentConfig {
  const urls = SERVICE_URLS[env];
  
  if (env === 'development') {
    return {
      // API Configuration
      apiUrl: getEnvVar('REACT_APP_API_URL', urls.backend),
      wsUrl: getEnvVar('REACT_APP_WS_URL', urls.backend.replace('http', 'ws')),
      
      // Payment Configuration
      enableMockPayments: getEnvBool('REACT_APP_ENABLE_MOCK_PAYMENTS', true),
      paymentAccountNumber: getEnvVar('REACT_APP_PAYMENT_ACCOUNT', '1234567890'),
      paymentMode: getEnvVar('REACT_APP_PAYMENT_MODE', 'mock') as 'mock' | 'sandbox' | 'production',
      
      // UI Configuration
      showDebugInfo: getEnvBool('REACT_APP_SHOW_DEBUG_INFO', true),
      logLevel: getEnvVar('REACT_APP_LOG_LEVEL', 'debug') as 'debug' | 'info' | 'warn' | 'error',
      
      // Service URLs
      kioskUrl: getEnvVar('REACT_APP_KIOSK_URL', urls.kiosk),
      adminUrl: getEnvVar('REACT_APP_ADMIN_URL', urls.admin),
      backendUrl: getEnvVar('REACT_APP_BACKEND_URL', urls.backend),
      
      // SSE Health Check Configuration
      sseHealthCheckInitialInterval: getEnvNumber('REACT_APP_SSE_HEALTH_CHECK_INITIAL_INTERVAL', 300000), // 5 minutes
      sseHealthCheckBackoffMultiplier: getEnvNumber('REACT_APP_SSE_HEALTH_CHECK_BACKOFF_MULTIPLIER', 2),
      sseHealthCheckMaxInterval: getEnvNumber('REACT_APP_SSE_HEALTH_CHECK_MAX_INTERVAL', 900000), // 15 minutes
      sseHealthCheckMaxAttempts: getEnvNumber('REACT_APP_SSE_HEALTH_CHECK_MAX_ATTEMPTS', 8),
      sseHealthCheckMaxTotalTime: getEnvNumber('REACT_APP_SSE_HEALTH_CHECK_MAX_TOTAL_TIME', 1800000), // 30 minutes
    };
  } else {
    return {
      // API Configuration
      apiUrl: getEnvVar('REACT_APP_API_URL', urls.backend),
      wsUrl: getEnvVar('REACT_APP_WS_URL', urls.backend.replace('https', 'wss')),
      
      // Payment Configuration
      enableMockPayments: getEnvBool('REACT_APP_ENABLE_MOCK_PAYMENTS', false),
      paymentAccountNumber: getEnvVar('REACT_APP_PAYMENT_ACCOUNT', '1234567890'),
      paymentMode: getEnvVar('REACT_APP_PAYMENT_MODE', 'production') as 'mock' | 'sandbox' | 'production',
      
      // UI Configuration
      showDebugInfo: getEnvBool('REACT_APP_SHOW_DEBUG_INFO', false),
      logLevel: getEnvVar('REACT_APP_LOG_LEVEL', 'warn') as 'debug' | 'info' | 'warn' | 'error',
      
      // Service URLs
      kioskUrl: getEnvVar('REACT_APP_KIOSK_URL', urls.kiosk),
      adminUrl: getEnvVar('REACT_APP_ADMIN_URL', urls.admin),
      backendUrl: getEnvVar('REACT_APP_BACKEND_URL', urls.backend),
      
      // SSE Health Check Configuration
      sseHealthCheckInitialInterval: getEnvNumber('REACT_APP_SSE_HEALTH_CHECK_INITIAL_INTERVAL', 300000), // 5 minutes
      sseHealthCheckBackoffMultiplier: getEnvNumber('REACT_APP_SSE_HEALTH_CHECK_BACKOFF_MULTIPLIER', 2),
      sseHealthCheckMaxInterval: getEnvNumber('REACT_APP_SSE_HEALTH_CHECK_MAX_INTERVAL', 900000), // 15 minutes
      sseHealthCheckMaxAttempts: getEnvNumber('REACT_APP_SSE_HEALTH_CHECK_MAX_ATTEMPTS', 8),
      sseHealthCheckMaxTotalTime: getEnvNumber('REACT_APP_SSE_HEALTH_CHECK_MAX_TOTAL_TIME', 1800000), // 30 minutes
    };
  }
}

// Simplified environment detection
export const getCurrentEnvironment = (): Environment => {
  // Check for process.env (Node.js environment)
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'production' ? 'production' : 'development';
  }
  
  // Check if we're on Railway domain (most reliable for production detection)
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.hostname.includes('railway.app') || 
        window.location.hostname.includes('up.railway.app')) {
      return 'production';
    }
  }
  
  // Check for import.meta.env (Vite environment)
  if (typeof window !== 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta = (globalThis as any).import?.meta;
      if (meta?.env) {
        return meta.env.MODE === 'production' ? 'production' : 'development';
      }
    } catch {
      // Ignore errors
    }
  }
  
  // Additional fallback: check for production URLs in environment variables
  if (typeof window !== 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta = (globalThis as any).import?.meta;
      if (meta?.env) {
        const apiUrl = meta.env.VITE_API_URL ?? meta.env.REACT_APP_API_URL;
        if (apiUrl?.includes('railway.app')) {
          return 'production';
        }
      }
    } catch {
      // Ignore errors
    }
  }
  
  return 'development';
};

// Get current environment configuration
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = getCurrentEnvironment();
  return getConfigForEnvironment(env);
};

// Simple environment checks
export const isDevelopment = (): boolean => getCurrentEnvironment() === 'development';
export const isProduction = (): boolean => getCurrentEnvironment() === 'production';

// Utility functions for easy access to service URLs
export const getBackendUrl = (): string => getEnvironmentConfig().backendUrl;
export const getKioskUrl = (): string => getEnvironmentConfig().kioskUrl;
export const getAdminUrl = (): string => getEnvironmentConfig().adminUrl;
export const getApiUrl = (): string => getEnvironmentConfig().apiUrl;
export const getWsUrl = (): string => getEnvironmentConfig().wsUrl;

// Service-specific configuration helpers
export const getPaymentConfig = (): { enableMockPayments: boolean; paymentAccountNumber: string; paymentMode: 'mock' | 'sandbox' | 'production' } => {
  const config = getEnvironmentConfig();
  return {
    enableMockPayments: config.enableMockPayments,
    paymentAccountNumber: config.paymentAccountNumber,
    paymentMode: config.paymentMode,
  };
};

export const getUIConfig = (): { showDebugInfo: boolean; logLevel: 'debug' | 'info' | 'warn' | 'error' } => {
  const config = getEnvironmentConfig();
  return {
    showDebugInfo: config.showDebugInfo,
    logLevel: config.logLevel,
  };
};

