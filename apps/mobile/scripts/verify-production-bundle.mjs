import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLACEHOLDER_ENV = {
  EXPO_PUBLIC_API_URL: 'https://api.example.com',
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios-client.apps.googleusercontent.com',
  EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: 'com.googleusercontent.apps.ios-client',
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-client.apps.googleusercontent.com',
  EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID: 'android-key',
  EXPO_PUBLIC_REVENUECAT_API_KEY_IOS: 'ios-key',
  EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID: 'annual',
  EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID: 'kure_cal_pro',
  EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID: 'monthly',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'expo-public-anon-key',
  EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = mkdtempSync(path.join(tmpdir(), 'kurecal-mobile-export-'));
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function fail(message) {
  throw new Error(`[verify-production-bundle] ${message}`);
}

try {
  console.log('Running Expo production bundle preflight...');

  const exportResult = spawnSync(
    npxCommand,
    [
      'expo',
      'export',
      '--platform',
      'ios',
      '--output-dir',
      outputDir,
      '--no-bytecode',
      '--no-minify',
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        ...PLACEHOLDER_ENV,
      },
      stdio: 'inherit',
    }
  );

  if (exportResult.status !== 0) {
    fail(`expo export failed with exit code ${exportResult.status ?? 'unknown'}`);
  }

  const bundleDirectory = path.join(outputDir, '_expo', 'static', 'js', 'ios');
  const bundleFile = readdirSync(bundleDirectory).find((entry) => entry.endsWith('.js'));

  if (!bundleFile) {
    fail(`no JavaScript bundle found under ${bundleDirectory}`);
  }

  const bundleContents = readFileSync(path.join(bundleDirectory, bundleFile), 'utf8');

  for (const value of [
    PLACEHOLDER_ENV.EXPO_PUBLIC_API_URL,
    PLACEHOLDER_ENV.EXPO_PUBLIC_SUPABASE_URL,
    PLACEHOLDER_ENV.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ]) {
    if (!bundleContents.includes(value)) {
      fail(`expected placeholder value "${value}" to be inlined into the bundle`);
    }
  }

  if (/\bprocess\.env\.EXPO_PUBLIC_/u.test(bundleContents)) {
    fail('found non-inlined Expo public env access in the production bundle');
  }

  console.log('Expo production bundle preflight passed.');
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
