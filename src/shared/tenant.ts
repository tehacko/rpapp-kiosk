import { getApiUrl } from '../config/environments';

export function getTenantFromPath(pathname: string = window.location.pathname): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  // Expect /{tenant}/kiosk/... or /{tenant}/...
  return segments[0] ?? null;
}

export function buildTenantApiBase(): string {
  // Return just the origin (no /api) - tenant will be injected into endpoints
  const base = getApiUrl().replace(/\/+$/, '');
  // Strip any existing /api path from base URL
  try {
    const url = new URL(base);
    return url.origin;
  } catch {
    return base.replace(/\/api\/?$/, '').replace(/\/api\/?$/, '');
  }
}

/**
 * Insert tenant segment into API endpoint paths.
 * Converts `/api/foo` -> `/api/{tenant}/foo` when tenant is present.
 */
export function withTenantInPath(endpoint: string, pathname?: string): string {
  const tenant = getTenantFromPath(pathname);
  if (!tenant) return endpoint;
  if (endpoint.startsWith('/api/')) {
    return `/api/${tenant}${endpoint.slice(4)}`;
  }
  return endpoint;
}

export function buildTenantBaseName(): string {
  const tenant = getTenantFromPath();
  return tenant ? `/${tenant}` : '/';
}

