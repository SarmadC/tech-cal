const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Expo's serializer supports bundle splitting and bytecode. Starting with that
// serializer lets Sentry inject debug IDs without wrapping the final result.
const config = getSentryExpoConfig(projectRoot, {
  annotateReactComponents: false,
  includeWebReplay: false,
});

config.watchFolders = [workspaceRoot];
config.resolver.alias = {
  '@kurecal/brand': path.resolve(workspaceRoot, 'packages/brand/src/index.ts'),
  '@kurecal/domain': path.resolve(workspaceRoot, 'packages/domain/src/index.ts'),
};
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
