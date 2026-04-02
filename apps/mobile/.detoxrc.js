/** @type {import('detox').DetoxConfig} */
module.exports = {
  artifacts: {
    rootDir: "e2e/test-results/.detox-artifacts",
    plugins: {
      screenshot: "manual",
    },
  },
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js",
    },
    jest: {
      setupTimeout: 60000,
    },
  },
  apps: {
    "ios.sim.debug": {
      type: "ios.app",
      binaryPath:
        "ios/build/Build/Products/Debug-iphonesimulator/OpenSlaqDev.app",
      build:
        "xcodebuild -workspace ios/OpenSlaqDev.xcworkspace -scheme OpenSlaqDev -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
    },
    "ios.sim.release": {
      type: "ios.app",
      binaryPath:
        "ios/build/Build/Products/Release-iphonesimulator/OpenSlaqDev.app",
      build:
        "xcodebuild -workspace ios/OpenSlaqDev.xcworkspace -scheme OpenSlaqDev -configuration Release -sdk iphonesimulator -derivedDataPath ios/build",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: process.env.DTX_DEVICE_UDID
        ? { id: process.env.DTX_DEVICE_UDID }
        : { type: "iPhone 17" },
    },
  },
  configurations: {
    "ios.sim.debug": {
      device: "simulator",
      app: "ios.sim.debug",
    },
    "ios.sim.release": {
      device: "simulator",
      app: "ios.sim.release",
    },
  },
};
