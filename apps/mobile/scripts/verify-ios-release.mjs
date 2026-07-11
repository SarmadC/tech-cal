import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productionEnv = {
  APP_VARIANT: 'production',
  EXPO_PUBLIC_API_URL: 'https://www.kure-cal.com',
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios-client.apps.googleusercontent.com',
  EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: 'com.googleusercontent.apps.ios-client',
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-client.apps.googleusercontent.com',
  EXPO_PUBLIC_REVENUECAT_API_KEY_IOS: 'appl_release_check',
  EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID: 'kurecal_pro_annual',
  EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID: 'kure_cal_pro',
  EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID: 'kurecal_pro_monthly',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'release-check-anon-key',
  EXPO_PUBLIC_SUPABASE_URL: 'https://release-check.supabase.co',
};

function fail(message) {
  throw new Error(`[verify-ios-release] ${message}`);
}

if (existsSync(path.join(projectRoot, 'ios'))) {
  fail('apps/mobile/ios must not be checked in; EAS must generate it from Expo config.');
}

const eas = JSON.parse(readFileSync(path.join(projectRoot, 'eas.json'), 'utf8'));
if (JSON.stringify(eas).includes('YOUR_ASC_APP_ID')) {
  fail('eas.json still contains the App Store Connect placeholder.');
}

const easIgnore = readFileSync(path.join(projectRoot, '.easignore'), 'utf8');
if (!/^\.env$/mu.test(easIgnore) || !/^ios\/$/mu.test(easIgnore)) {
  fail('.easignore must exclude local environment files and generated native code.');
}

const icon = readFileSync(path.join(projectRoot, 'assets', 'icon.png'));
if (icon.toString('ascii', 1, 4) !== 'PNG') {
  fail('assets/icon.png is not a PNG.');
}

const width = icon.readUInt32BE(16);
const height = icon.readUInt32BE(20);
const colorType = icon[25];
if (width !== 1024 || height !== 1024) {
  fail(`App Store icon must be 1024x1024; received ${width}x${height}.`);
}
if (colorType === 4 || colorType === 6) {
  fail('App Store icon must not contain an alpha channel.');
}

const expoConfig = spawnSync('npx', ['expo', 'config', '--json'], {
  cwd: projectRoot,
  env: { ...process.env, ...productionEnv },
  encoding: 'utf8',
});
if (expoConfig.status !== 0) {
  process.stderr.write(expoConfig.stderr ?? '');
  fail('Unable to resolve the production Expo config.');
}

const config = JSON.parse(expoConfig.stdout);
if (config.name !== 'KureCal' || config.ios?.bundleIdentifier !== 'com.kurecal.mobile') {
  fail('Production name or iOS bundle identifier is incorrect.');
}
if (config.ios?.supportsTablet !== false) {
  fail('The v1 release must be configured for iPhone only.');
}
if (config.ios?.entitlements?.['aps-environment'] !== 'production') {
  fail('Production APNs entitlement is missing.');
}
if (!config.ios?.entitlements?.['com.apple.developer.applesignin']?.includes('Default')) {
  fail('Sign in with Apple entitlement is missing.');
}
if (config.ios?.infoPlist?.NSLocationWhenInUseUsageDescription?.includes('Dev')) {
  fail('Production location permission text still references the development app.');
}
for (const unusedPermission of [
  'NSCameraUsageDescription',
  'NSFaceIDUsageDescription',
  'NSMicrophoneUsageDescription',
  'NSLocationAlwaysUsageDescription',
  'NSLocationAlwaysAndWhenInUseUsageDescription',
]) {
  if (config.ios?.infoPlist?.[unusedPermission]) {
    fail(`Unused iOS permission declaration present: ${unusedPermission}.`);
  }
}
if (config.ios?.infoPlist?.ITSAppUsesNonExemptEncryption !== false) {
  fail('Export-compliance declaration is missing.');
}

const imagePickerPlugin = config.plugins?.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-image-picker'
);
if (imagePickerPlugin?.[1]?.cameraPermission !== false ||
    imagePickerPlugin?.[1]?.microphonePermission !== false) {
  fail('Unused camera and microphone permissions must be disabled.');
}
const secureStorePlugin = config.plugins?.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-secure-store'
);
if (secureStorePlugin?.[1]?.faceIDPermission !== false) {
  fail('Unused Face ID permission must be disabled.');
}
const locationPlugin = config.plugins?.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-location'
);
if (locationPlugin?.[1]?.locationAlwaysPermission !== false ||
    locationPlugin?.[1]?.locationAlwaysAndWhenInUsePermission !== false) {
  fail('Background/always location permissions must be disabled.');
}

console.log('iOS release configuration passed.');
