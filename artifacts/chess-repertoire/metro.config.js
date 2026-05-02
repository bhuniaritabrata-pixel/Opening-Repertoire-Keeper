const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// -------------------------------------------------------------------
// Workaround: @react-native/babel-plugin-codegen@0.83.6 (pulled in by
// @expo/metro-config@54) cannot parse inline Flow types used inside
// react-native's src/private/components/virtualview/ files
// (NativeModeChangeEvent etc.). Those components are all declared
// interfaceOnly=true so codegen produces no output anyway — we redirect
// every import from that directory to plain-JS stubs that call
// requireNativeComponent() directly, bypassing the Flow parser entirely.
// -------------------------------------------------------------------
const STUBS_DIR = path.join(__dirname, "stubs");
const VIRTUALVIEW_STUBS = {
  "./VirtualViewNativeComponent": path.join(
    STUBS_DIR,
    "VirtualViewNativeComponent.js"
  ),
  "./VirtualViewExperimentalNativeComponent": path.join(
    STUBS_DIR,
    "VirtualViewExperimentalNativeComponent.js"
  ),
};

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const stub = VIRTUALVIEW_STUBS[moduleName];
  if (
    stub &&
    context.originModulePath &&
    context.originModulePath.includes(
      path.join("react-native", "src", "private", "components", "virtualview")
    )
  ) {
    return { filePath: stub, type: "sourceFile" };
  }

  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
