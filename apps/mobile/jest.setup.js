global.__ExpoImportMetaRegistry = {
  url: 'http://localhost',
};

process.env.EXPO_PUBLIC_APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://kurecal.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'anon-key';
process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI =
  process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI ?? 'kurecal-dev://auth/callback';
process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? 'ios-key';
process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? 'android-key';
process.env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID ?? 'kure_cal_pro';
process.env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID ?? 'monthly';
process.env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID ?? 'annual';

if (typeof global.structuredClone !== 'function') {
  global.structuredClone = (value) => JSON.parse(JSON.stringify(value));
}

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock-documents/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false, isDirectory: false }),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-location', () => ({
  Accuracy: {
    Balanced: 3,
  },
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'denied',
    granted: false,
    canAskAgain: true,
    expires: 'never',
  }),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([]),
}));

afterEach(() => {
  const { resetMobileEnvForTests } = require('./lib/env');
  resetMobileEnvForTests();
});
