#!/usr/bin/env node

/**
 * Kiosk Deployment Helper Script
 * 
 * This script helps deploy individual kiosk instances by:
 * 1. Building the kiosk app
 * 2. Creating kiosk-specific deployment configurations
 * 3. Generating deployment URLs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KIOSK_IDS = [1, 2, 3, 4, 5]; // Default kiosk IDs
const BASE_URL = process.env.KIOSK_BASE_URL || 'https://your-domain.com';

function buildApp() {
  console.log('🔨 Building kiosk app...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

function generateKioskUrls() {
  console.log('\n🌐 Generated Kiosk URLs:');
  console.log('========================');
  
  KIOSK_IDS.forEach(id => {
    const url = `${BASE_URL}?kioskId=${id}`;
    console.log(`Kiosk #${id}: ${url}`);
  });
  
  console.log('\n📋 Deployment Checklist:');
  console.log('========================');
  console.log('□ Deploy built files to your hosting platform');
  console.log('□ Ensure backend server is running');
  console.log('□ Verify kiosk records exist in database');
  console.log('□ Test each kiosk URL');
  console.log('□ Configure environment variables');
  console.log('□ Set up monitoring and logging');
}

function createDeploymentConfig() {
  const config = {
    kiosks: KIOSK_IDS.map(id => ({
      id,
      url: `${BASE_URL}?kioskId=${id}`,
      name: `Kiosk ${id}`,
      status: 'pending'
    })),
    baseUrl: BASE_URL,
    lastUpdated: new Date().toISOString()
  };
  
  const configPath = path.join(__dirname, 'deployment-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\n📄 Deployment config saved to: ${configPath}`);
}

function main() {
  console.log('🚀 Kiosk Deployment Helper');
  console.log('==========================\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const kioskIds = args.length > 0 ? args.map(Number) : KIOSK_IDS;
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node deploy-kiosk.js [kiosk-ids...]');
    console.log('Example: node deploy-kiosk.js 1 2 3');
    console.log('Environment variables:');
    console.log('  KIOSK_BASE_URL - Base URL for kiosk instances');
    return;
  }
  
  // Update kiosk IDs if provided
  if (args.length > 0) {
    KIOSK_IDS.length = 0;
    KIOSK_IDS.push(...kioskIds);
  }
  
  buildApp();
  generateKioskUrls();
  createDeploymentConfig();
  
  console.log('\n✅ Deployment preparation complete!');
  console.log('See KIOSK-DEPLOYMENT.md for detailed instructions.');
}

// Always run main function for now
main();

export { buildApp, generateKioskUrls, createDeploymentConfig };
