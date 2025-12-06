#!/usr/bin/env node

/**
 * Generate runtime-config.json from Railway environment variables
 * This script runs after build to inject environment-specific config
 * without requiring a rebuild when config changes.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = join(__dirname, '..', 'dist');
mkdirSync(distDir, { recursive: true });

// Read environment variables (Railway provides these at build time)
const config = {
  apiUrl:
    process.env.REACT_APP_API_URL ||
    process.env.VITE_API_URL ||
    'http://localhost:3015',
  wsUrl:
    process.env.REACT_APP_WS_URL ||
    process.env.VITE_WS_URL ||
    'ws://localhost:3015',
  enableMockPayments:
    (process.env.REACT_APP_ENABLE_MOCK_PAYMENTS || 'false') === 'true',
  paymentMode: process.env.REACT_APP_PAYMENT_MODE || 'production',
  showDebugInfo: (process.env.REACT_APP_SHOW_DEBUG_INFO || 'false') === 'true',
  logLevel: process.env.REACT_APP_LOG_LEVEL || 'warn',
};

const configPath = join(distDir, 'runtime-config.json');
writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('✅ Generated runtime-config.json from Railway environment variables');
console.log(`   Location: ${configPath}`);
console.log(`   Config: ${JSON.stringify(config, null, 2)}`);

