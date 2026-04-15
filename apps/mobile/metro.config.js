const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

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
