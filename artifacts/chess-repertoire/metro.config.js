const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the whole workspace so linked packages resolve correctly.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Custom Babel transformer: replaces react-native/src/private codegen files
// with plain requireNativeComponent stubs before Babel can fail on their
// inline Flow types. Works regardless of which react-native version Metro
// resolves (0.81.5 or 0.85.x) since it intercepts by file content.
config.transformer.babelTransformerPath = require.resolve("./metro-transform.js");

module.exports = config;
