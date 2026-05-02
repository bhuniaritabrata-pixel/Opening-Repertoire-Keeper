const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// -------------------------------------------------------------------
// Workaround: @react-native/babel-plugin-codegen@0.83.6 (pulled in by
// @expo/metro-config@54) cannot parse the inline Flow type
// `NativeModeChangeEvent` used in react-native's VirtualViewNativeComponent.
// Since that component is declared `interfaceOnly: true`, codegen produces no
// output anyway. We redirect any import of that file to a plain JS stub that
// just calls requireNativeComponent('VirtualView') directly.
// -------------------------------------------------------------------
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isVirtualViewImport =
    moduleName === "./VirtualViewNativeComponent" &&
    context.originModulePath &&
    context.originModulePath.includes(
      path.join("virtualview", "VirtualView")
    );

  if (isVirtualViewImport) {
    return {
      filePath: path.join(__dirname, "stubs", "VirtualViewNativeComponent.js"),
      type: "sourceFile",
    };
  }

  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
