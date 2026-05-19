/**
 * Generates `PrivacyInfo.xcprivacy` for the iOS target after `expo prebuild`.
 * Required by Apple's App Store privacy manifest policy.
 *
 * `expo prebuild --clean` wipes `ios/` without re-emitting the manifest, so
 * this plugin owns the full file: the React Native / Expo runtime API-type
 * declarations AND KureCal's app-level data collection declarations.
 *
 * Idempotent — re-running prebuild produces byte-identical output. If a
 * manifest already exists at the target path, additional collected-data-type
 * entries already present are preserved (deduped by category key).
 */
const fs = require('fs');
const path = require('path');

const { withDangerousMod } = require('@expo/config-plugins');
const plist = require('@expo/plist').default;

const APP_FUNCTIONALITY = 'NSPrivacyCollectedDataTypePurposeAppFunctionality';

/**
 * Required Reason API declarations for the React Native / Expo runtime.
 * Reason codes come from Apple's published list
 * (https://developer.apple.com/documentation/bundleresources/privacy_manifest_files).
 */
const ACCESSED_API_TYPES = [
  {
    NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
    NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
  },
  {
    NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
    NSPrivacyAccessedAPITypeReasons: ['0A2A.1', '3B52.1', 'C617.1'],
  },
  {
    NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
    NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
  },
  {
    NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
    NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
  },
];

/**
 * Each entry mirrors Apple's schema:
 *   NSPrivacyCollectedDataType        — Apple category key
 *   NSPrivacyCollectedDataTypeLinked  — tied to user identity
 *   NSPrivacyCollectedDataTypeTracking — used for cross-app/site tracking
 *   NSPrivacyCollectedDataTypePurposes — array of purpose keys
 */
const COLLECTED_DATA_TYPES = [
  {
    NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeName',
    NSPrivacyCollectedDataTypeLinked: true,
    NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: [APP_FUNCTIONALITY],
  },
  {
    NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
    NSPrivacyCollectedDataTypeLinked: true,
    NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: [APP_FUNCTIONALITY],
  },
  {
    NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeUserID',
    NSPrivacyCollectedDataTypeLinked: true,
    NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: [APP_FUNCTIONALITY],
  },
  {
    NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeDeviceID',
    NSPrivacyCollectedDataTypeLinked: true,
    NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: [APP_FUNCTIONALITY],
  },
  {
    NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePurchaseHistory',
    NSPrivacyCollectedDataTypeLinked: true,
    NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: [APP_FUNCTIONALITY],
  },
  {
    NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherUserContent',
    NSPrivacyCollectedDataTypeLinked: true,
    NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: [APP_FUNCTIONALITY],
  },
  {
    NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeCoarseLocation',
    NSPrivacyCollectedDataTypeLinked: true,
    NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: [APP_FUNCTIONALITY],
  },
  {
    // Discover search queries flow to the backend as part of the user's
    // request body — declared even though we don't persist them long-term.
    NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeSearchHistory',
    NSPrivacyCollectedDataTypeLinked: true,
    NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: [APP_FUNCTIONALITY],
  },
];

function mergeCollectedDataTypes(existing) {
  const seen = new Set();
  const merged = [];
  for (const entry of [...(existing || []), ...COLLECTED_DATA_TYPES]) {
    const key = entry.NSPrivacyCollectedDataType;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }
  return merged.sort((a, b) =>
    a.NSPrivacyCollectedDataType.localeCompare(b.NSPrivacyCollectedDataType)
  );
}

function withPrivacyManifest(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const manifestPath = path.join(
        cfg.modRequest.platformProjectRoot,
        cfg.modRequest.projectName,
        'PrivacyInfo.xcprivacy'
      );

      const existing = fs.existsSync(manifestPath)
        ? plist.parse(fs.readFileSync(manifestPath, 'utf8'))
        : {};

      const manifest = {
        NSPrivacyAccessedAPITypes: ACCESSED_API_TYPES,
        NSPrivacyCollectedDataTypes: mergeCollectedDataTypes(
          existing.NSPrivacyCollectedDataTypes
        ),
        NSPrivacyTracking: false,
        NSPrivacyTrackingDomains: [],
      };

      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      fs.writeFileSync(manifestPath, plist.build(manifest));
      return cfg;
    },
  ]);
}

module.exports = withPrivacyManifest;
