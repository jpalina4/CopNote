// Web setup for expo-sqlite: https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/#web-setup
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// On web, SQLite runs as a WebAssembly file, so Metro must treat .wasm as an asset.
config.resolver.assetExts.push('wasm');

// SQLite's web worker needs SharedArrayBuffer, which browsers only allow with these headers.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = config;
