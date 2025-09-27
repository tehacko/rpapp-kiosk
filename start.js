import { spawn } from 'child_process';
import path from 'path';

const port = process.env.PORT || 3000;

console.log('Starting kiosk app...');
console.log('Environment variables:');
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('REACT_APP_WS_URL:', process.env.REACT_APP_WS_URL);
console.log('REACT_APP_ENVIRONMENT:', process.env.REACT_APP_ENVIRONMENT);
console.log('PORT:', port);

// Use serve to serve the built static files
const serveProcess = spawn('npx', ['serve', '-s', 'dist', '-l', `tcp://0.0.0.0:${port}`], {
  stdio: 'inherit',
  shell: true
});

serveProcess.on('error', (error) => {
  console.error('Failed to start serve:', error);
  process.exit(1);
});

serveProcess.on('exit', (code) => {
  console.log(`Serve process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  serveProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  serveProcess.kill('SIGINT');
});
