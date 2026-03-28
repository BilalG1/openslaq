import tseslint from "typescript-eslint";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactNativePlugin from "eslint-plugin-react-native";
import reactNativeA11yPlugin from "eslint-plugin-react-native-a11y";
import oxlint from "eslint-plugin-oxlint";

export default [
  {
    // Global ignores
    ignores: [
      "node_modules/**",
      ".expo/**",
      "ios/**",
      "android/**",
      "coverage/**",
      "babel.config.js",
      "metro.config.js",
      "jest.config.js",
      "jest.setup.js",
      "jest-bun-resolver.js",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
      "**/__mocks__/**",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooksPlugin,
      "react-native": reactNativePlugin,
      "react-native-a11y": reactNativeA11yPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // React Native globals
        __DEV__: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        AbortController: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        console: "readonly",
        require: "readonly",
        module: "readonly",
        process: "readonly",
        alert: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
      },
    },
    rules: {
      // react-native recommended rules
      // Disabled: can't statically trace styles through makeStyles() factory functions
      "react-native/no-unused-styles": "off",
      "react-native/no-inline-styles": "error",
      "react-native/no-color-literals": "error",
      "react-native/split-platform-components": "error",
      "react-native/no-raw-text": "error",
      "react-native/no-single-element-style-arrays": "error",

      // react-native-a11y basic rules
      "react-native-a11y/has-accessibility-hint": "error",
      "react-native-a11y/has-accessibility-props": "error",
      "react-native-a11y/has-valid-accessibility-actions": "error",
      "react-native-a11y/has-valid-accessibility-component-type": "error",
      "react-native-a11y/has-valid-accessibility-descriptors": "error",
      "react-native-a11y/has-valid-accessibility-role": "error",
      "react-native-a11y/has-valid-accessibility-state": "error",
      "react-native-a11y/has-valid-accessibility-states": "error",
      "react-native-a11y/has-valid-accessibility-traits": "error",
      "react-native-a11y/has-valid-accessibility-value": "error",
      "react-native-a11y/no-nested-touchables": "error",

      // react-hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // oxlint compatibility — must be last to disable rules oxlint already covers
  ...oxlint.configs["flat/recommended"],
];
