const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// The workspace root has react-native@0.85.2 which is incompatible with the
// @react-native/codegen@0.83.6 hoisted there. The artifact's node_modules/react-native
// symlinks to @0.81.5 (compatible). Redirect every Metro resolution that lands
// in the workspace-root copy to the real path of react-native@0.81.5 so that
// the codegen plugin never sees 0.85.x files.
const WORKSPACE_RN_ROOT = path.join(
  workspaceRoot,
  "node_modules",
  "react-native"
);
const LOCAL_RN_REAL = fs.realpathSync(
  path.join(projectRoot, "node_modules", "react-native")
);

// Monorepo: watch the whole workspace so linked packages resolve correctly.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Intercept resolutions that land in workspace-root react-native@0.85.2 and
// redirect them to the equivalent file in react-native@0.81.5.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const result = context.resolveRequest(context, moduleName, platform);
  if (
    result &&
    result.filePath &&
    (result.filePath.startsWith(WORKSPACE_RN_ROOT + path.sep) ||
      result.filePath === WORKSPACE_RN_ROOT)
  ) {
    const relativePath = path.relative(WORKSPACE_RN_ROOT, result.filePath);
    const localPath = path.join(LOCAL_RN_REAL, relativePath);
    if (fs.existsSync(localPath)) {
      return { ...result, filePath: localPath };
    }
  }
  return result;
};

// Custom Babel transformer: stubs out virtualview NativeComponent files which
// use inline Flow event types that @react-native/codegen@0.83.6 cannot parse
// (this affects BOTH react-native@0.81.5 and @0.85.2 for these specific files).
config.transformer.babelTransformerPath = require.resolve(
  "./metro-transform.js"
);

module.exports = config;
