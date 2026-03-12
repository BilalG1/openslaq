const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

// Load .env from monorepo root (Expo only reads from its own project dir by default)
require("@expo/env").load(monorepoRoot, { force: true });

const config = getDefaultConfig(projectRoot);

// Watch monorepo packages for changes
config.watchFolders = [monorepoRoot];

// Resolve packages from both the app and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Prevent duplicate React in the bundle. The monorepo root has React 19.2
// (for the web app) while the mobile app pins React 19.1. Without this fix,
// Metro bundles both copies and hooks break at runtime.
const rootReactDir = path.resolve(monorepoRoot, "node_modules/react");
const appReactDir = path.resolve(projectRoot, "node_modules/react");

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = originalResolveRequest
    ? (ctx, name, plat) => originalResolveRequest(ctx, name, plat)
    : (ctx, name, plat) =>
        ctx.resolveRequest(
          { ...ctx, resolveRequest: undefined },
          name,
          plat,
        );

  const result = resolve(context, moduleName, platform);

  // Redirect root react → mobile app react so only one copy is bundled.
  if (
    result?.type === "sourceFile" &&
    result.filePath?.startsWith(rootReactDir + "/")
  ) {
    return {
      ...result,
      filePath: result.filePath.replace(rootReactDir, appReactDir),
    };
  }
  return result;
};

// Enable package.json "exports" field resolution (needed for hono/client, etc.)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
