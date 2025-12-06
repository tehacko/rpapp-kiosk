import type { EnvironmentConfig } from 'pi-kiosk-shared';

type RuntimeConfig = Partial<EnvironmentConfig>;

const RUNTIME_CONFIG_PATH = '/runtime-config.json';

const fallbackFromEnv: RuntimeConfig = {
  apiUrl:
    import.meta.env.VITE_API_URL ??
    import.meta.env.REACT_APP_API_URL ??
    'http://localhost:3015',
  wsUrl:
    import.meta.env.VITE_WS_URL ??
    import.meta.env.REACT_APP_WS_URL ??
    'ws://localhost:3015',
  enableMockPayments:
    import.meta.env.REACT_APP_ENABLE_MOCK_PAYMENTS === 'true',
  paymentMode:
    (import.meta.env.REACT_APP_PAYMENT_MODE as EnvironmentConfig['paymentMode'] | undefined) ??
    'production',
  showDebugInfo:
    import.meta.env.REACT_APP_SHOW_DEBUG_INFO === 'true',
  logLevel:
    (import.meta.env.REACT_APP_LOG_LEVEL as EnvironmentConfig['logLevel'] | undefined) ??
    'warn',
};

async function fetchRuntimeConfig(): Promise<RuntimeConfig | null> {
  try {
    const response = await fetch(RUNTIME_CONFIG_PATH, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as RuntimeConfig;
    return data;
  } catch {
    return null;
  }
}

export async function loadRuntimeConfig(): Promise<void> {
  const runtimeConfig = (await fetchRuntimeConfig()) ?? fallbackFromEnv;

  if (typeof window !== 'undefined') {
    (window as typeof window & { __RUNTIME_CONFIG__?: RuntimeConfig }).__RUNTIME_CONFIG__ = runtimeConfig;
  }
}

