#!/usr/bin/env node

const os = require('os');
const { spawn } = require('child_process');

const APP_NAME = process.env.APP_NAME || '资治通鉴深度阅读App';
const DEFAULT_BACKEND_PORT = '9091';

function isPrivateIpv4(address) {
  return (
    /^10\./.test(address) ||
    /^192\.168\./.test(address) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function pickLocalIpv4() {
  const interfaces = os.networkInterfaces();
  const preferredNames = ['en0', 'en1', 'Wi-Fi', 'wifi0', 'eth0', 'wlan0', 'Ethernet'];

  const pickFromEntries = entries =>
    entries?.find(
      entry => entry.family === 'IPv4' && !entry.internal && isPrivateIpv4(entry.address)
    );

  for (const name of preferredNames) {
    const entry = pickFromEntries(interfaces[name]);
    if (entry) {
      return entry.address;
    }
  }

  for (const entries of Object.values(interfaces)) {
    const entry = pickFromEntries(entries);
    if (entry) {
      return entry.address;
    }
  }

  return null;
}

function resolveBackendBaseUrl() {
  const explicit = process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const localIp = pickLocalIpv4();
  if (localIp) {
    return `http://${localIp}:${DEFAULT_BACKEND_PORT}`;
  }

  return `http://localhost:${DEFAULT_BACKEND_PORT}`;
}

const backendBaseUrl = resolveBackendBaseUrl();
const expoCli = require.resolve('expo/bin/cli', { paths: [__dirname, process.cwd()] });

if (process.argv.includes('--print-backend-url')) {
  console.log(backendBaseUrl);
  process.exit(0);
}

console.log(`[client:start] APP_NAME=${APP_NAME}`);
console.log(`[client:start] EXPO_PUBLIC_BACKEND_BASE_URL=${backendBaseUrl}`);

const child = spawn(process.execPath, [expoCli, 'start', '--lan', '--clear'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    APP_NAME,
    EXPO_PUBLIC_BACKEND_BASE_URL: backendBaseUrl,
  },
});

child.on('error', error => {
  console.error('[client:start] Failed to launch Expo:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  process.exit(code ?? 0);
});
