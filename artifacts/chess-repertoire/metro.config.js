const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// -------------------------------------------------------------------
// Monorepo fix: pnpm hoists a newer react-native to the workspace root
// (pulled in by other workspace packages). Tell Metro to always resolve
// node_modules from the project directory first so it consistently finds
// react-native@0.81.5 instead of the root's react-native@0.85.x.
// -------------------------------------------------------------------
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// -------------------------------------------------------------------
// Codegen stub: @react-native/babel-plugin-codegen@0.83.6 (used by
// @expo/metro-config@54) cannot parse the inline NativeModeChangeEvent
// Flow type in react-native's VirtualViewNativeComponent.js.
// That file is declared interfaceOnly=true so codegen produces nothing
// anyway — redirect its import to a plain JS stub.
// -------------------------------------------------------------------
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "./VirtualViewNativeComponent" &&
    context.originModulePath &&
    context.originModulePath.includes(
      ["react-native", "src", "private", "components", "virtualview"].join(
        path.sep
      )
    )
  ) {
    return {
      filePath: path.join(projectRoot, "stubs", "VirtualViewNativeComponent.js"),
      type: "sourceFile",
    };
  }

  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
