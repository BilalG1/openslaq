/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  resolver: "./jest-resolver.js",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Parenthesized expo-router group directories confuse Jest's resolver at depth > 1
    ".*app/\\(app\\)/\\[workspaceSlug\\]/\\(tabs\\)/\\(channels\\)/index$":
      "<rootDir>/app/(app)/[workspaceSlug]/(tabs)/(channels)/index",
    // Redirect css-interop JSX runtime (injected by nativewind/babel) to
    // standard React JSX runtime so the native Appearance bridge is never loaded.
    "^react-native-css-interop/jsx-runtime$": "react/jsx-runtime",
    "^react-native-css-interop/jsx-dev-runtime$": "react/jsx-dev-runtime",
    // Override the tsconfig paths → moduleNameMapper conversion from jest-expo
    // which incorrectly maps "react" to @types/react (type-only, no runtime JS).
    "^react$": "<rootDir>/../../node_modules/react",
  },
  transformIgnorePatterns: [
    "node_modules/(?!\\.bun/)(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|jose|yoga-layout|@openslaq/.*))",
    "node_modules/\\.bun/(?!.*node_modules/((jest-)?react-native|@react-native(-community)?|@react-native/.*|expo(nent)?|@expo(nent)?/.*|jose|yoga-layout|@openslaq/.*))",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/types/**",
    "!src/global.css",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 60,
    },
  },
  setupFiles: ["./jest.setup.js"],
  testPathIgnorePatterns: ["/node_modules/", "/e2e/", "\\.spec\\.ts$"],
};
