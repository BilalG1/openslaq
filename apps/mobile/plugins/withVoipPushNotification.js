const {
  withXcodeProject,
  withDangerousMod,
  withAppDelegate,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

// Native module source code is stored in plugins/native/ directory
const NATIVE_DIR = path.join(__dirname, "native");

/**
 * Adds PushKit + CallKit frameworks, writes native module files,
 * and modifies AppDelegate for VoIP push registration.
 */
const withVoipPushNotification = (config) => {
  // Step 1: Write native module files to ios/ directory
  config = withDangerousMod(config, [
    "ios",
    (mod) => {
      const iosDir = path.join(
        mod.modRequest.platformProjectRoot,
        mod.modRequest.projectName
      );

      // Copy native module files from plugins/native/
      const swiftSrc = path.join(NATIVE_DIR, "VoipCallModule.swift");
      const mSrc = path.join(NATIVE_DIR, "VoipCallModule.m");

      fs.copyFileSync(swiftSrc, path.join(iosDir, "VoipCallModule.swift"));
      fs.copyFileSync(mSrc, path.join(iosDir, "VoipCallModule.m"));

      return mod;
    },
  ]);

  // Step 2: Add frameworks + source files to Xcode project
  config = withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const targetUuid = project.getFirstTarget().uuid;
    const projName = mod.modRequest.projectName;

    // Add frameworks
    project.addFramework("PushKit.framework", {
      target: targetUuid,
      link: true,
    });
    project.addFramework("CallKit.framework", {
      target: targetUuid,
      link: true,
    });

    // Find the app group key (e.g. "OpenSlaq") to add source files
    const groups = project.hash.project.objects["PBXGroup"];
    let appGroupKey = null;
    for (const key in groups) {
      if (!key.endsWith("_comment") && groups[key].name === projName) {
        appGroupKey = key;
        break;
      }
    }

    // Add source files to Xcode project + Compile Sources build phase
    // Path must be relative to the .xcodeproj location (ios/)
    if (appGroupKey) {
      project.addSourceFile(`${projName}/VoipCallModule.swift`, { target: targetUuid }, appGroupKey);
      project.addSourceFile(`${projName}/VoipCallModule.m`, { target: targetUuid }, appGroupKey);
    }

    return mod;
  });

  // Step 3: Modify AppDelegate to initialize PushKit
  config = withAppDelegate(config, (mod) => {
    if (!mod.modResults.contents.includes("VoipCallManager.shared.startPushKit")) {
      const initLine =
        "    // Initialize PushKit for VoIP push notifications (must happen before JS loads)\n    VoipCallManager.shared.startPushKit()\n";
      mod.modResults.contents = mod.modResults.contents.replace(
        "    return super.application(application, didFinishLaunchingWithOptions: launchOptions)",
        initLine +
          "\n    return super.application(application, didFinishLaunchingWithOptions: launchOptions)"
      );
    }
    return mod;
  });

  return config;
};

module.exports = withVoipPushNotification;
