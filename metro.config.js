// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .cjs support (fixes expo-linking, reanimated, drawer, etc.)
config.resolver.sourceExts.push('cjs');

// Optional: Improve stability for reanimated
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;