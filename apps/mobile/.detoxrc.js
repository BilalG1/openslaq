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
        "ios/build/Build/Products/Debug-iphonesimulator/OpenSlaq.app",
      build:
        "xcodebuild -workspace ios/OpenSlaq.xcworkspace -scheme OpenSlaq -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
    },
    "ios.sim.release": {
      type: "ios.app",
      binaryPath:
        "ios/build/Build/Products/Release-iphonesimulator/OpenSlaq.app",
      build:
        "xcodebuild -workspace ios/OpenSlaq.xcworkspace -scheme OpenSlaq -configuration Release -sdk iphonesimulator -derivedDataPath ios/build",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: "iPhone 17",
      },
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
