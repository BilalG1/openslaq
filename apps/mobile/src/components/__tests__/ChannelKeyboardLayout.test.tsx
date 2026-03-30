/**
 * Tests that channel/DM/thread screens use KeyboardAvoidingView from
 * react-native-keyboard-controller (which matches native keyboard animation)
 * instead of React Native's built-in KeyboardAvoidingView.
 *
 * This is verified by checking the source imports rather than rendering the full
 * screens (which have too many dependencies). The structural behavior is tested
 * via the MessageInput KeyboardStickyView tests.
 */
import * as fs from "fs";
import * as path from "path";

const SCREENS = [
  "app/(app)/[workspaceSlug]/(tabs)/(channels)/[channelId].tsx",
  "app/(app)/[workspaceSlug]/(tabs)/(channels)/dm/[channelId].tsx",
  "app/(app)/[workspaceSlug]/thread/[parentMessageId].tsx",
];

const APP_ROOT = "app/_layout.tsx";
const MOBILE_ROOT = path.resolve(__dirname, "../../../");

describe("Channel screens use react-native-keyboard-controller", () => {
  for (const screen of SCREENS) {
    const basename = path.basename(screen, ".tsx");
    it(`${basename} imports KeyboardAvoidingView from react-native-keyboard-controller`, () => {
      const source = fs.readFileSync(path.resolve(MOBILE_ROOT, screen), "utf-8");
      expect(source).toContain("react-native-keyboard-controller");
    });

    it(`${basename} does NOT import KeyboardAvoidingView from react-native`, () => {
      const source = fs.readFileSync(path.resolve(MOBILE_ROOT, screen), "utf-8");
      // Should not import KeyboardAvoidingView from "react-native"
      const rnImportMatch = source.match(
        /import\s+\{[^}]*KeyboardAvoidingView[^}]*\}\s+from\s+["']react-native["']/,
      );
      expect(rnImportMatch).toBeNull();
    });
  }
});

describe("App root provides KeyboardProvider", () => {
  it("imports KeyboardProvider from react-native-keyboard-controller", () => {
    const source = fs.readFileSync(path.resolve(MOBILE_ROOT, APP_ROOT), "utf-8");
    expect(source).toContain("KeyboardProvider");
    expect(source).toContain("react-native-keyboard-controller");
  });
});
