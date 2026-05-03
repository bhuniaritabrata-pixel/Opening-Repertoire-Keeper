const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot   = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

// Detect whether we're running inside the monorepo (local dev / CI on the
// full repo) or in EAS's isolated project environment (cloud build).
const isMonorepo = fs.existsSync(
  path.join(workspaceRoot, "pnpm-workspace.yaml")
);

const config = getDefaultConfig(projectRoot);

if (isMonorepo) {
  // ── Monorepo: watch the whole workspace so linked packages resolve ──────
  config.watchFolders = [workspaceRoot];
  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot,   "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
  ];

  // The workspace root has react-native@0.85.2 which is incompatible with
  // @react-native/codegen@0.83.6.  Redirect every Metro resolution that
  // lands in the workspace-root copy → react-native@0.81.5 in local
  // node_modules.  Wrapped in try/catch so a missing symlink never throws.
  const WORKSPACE_RN_ROOT = path.join(
    workspaceRoot, "node_modules", "react-native"
  );
  const localRnPath = path.join(projectRoot, "node_modules", "react-native");

  try {
    const LOCAL_RN_REAL = fs.realpathSync(localRnPath);

    config.resolver.resolveRequest = (context, moduleName, platform) => {
      const result = context.resolveRequest(context, moduleName, platform);
      if (
        result?.filePath &&
        (result.filePath.startsWith(WORKSPACE_RN_ROOT + path.sep) ||
          result.filePath === WORKSPACE_RN_ROOT)
      ) {
        const rel       = path.relative(WORKSPACE_RN_ROOT, result.filePath);
        const localPath = path.join(LOCAL_RN_REAL, rel);
        if (fs.existsSync(localPath)) {
          return { ...result, filePath: localPath };
        }
      }
      return result;
    };
  } catch (_) {
    // Symlink not resolvable — skip the redirect (harmless in clean installs)
  }
}

// Custom Babel transformer: stubs out virtualview NativeComponent files which
// use inline Flow event types that @react-native/codegen@0.83.6 cannot parse.
// In EAS's clean install the affected paths simply won't match, so this is a
// no-op there.
config.transformer.babelTransformerPath = require.resolve(
  "./metro-transform.js"
);

module.exports = config;
