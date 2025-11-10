// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix the Metro resolution for React Native issues
config.resolver.extraNodeModules = {
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  'react': path.resolve(__dirname, 'node_modules/react')
};

// Add alias for victory-native to use victory on web platform
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  'victory-native': 'victory'
};

// Asset extensions
config.resolver.assetExts = [...config.resolver.assetExts, 'ttf'];

// Source extensions
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json', 'cjs', 'mjs'];

// Simplify to avoid more errors - just handle ttf files
if (!Array.isArray(config.resolver.unstable_mockModules)) {
  config.resolver.unstable_mockModules = [];
}

module.exports = config;