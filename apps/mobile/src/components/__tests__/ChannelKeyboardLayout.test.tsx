/**
 * Tests that:
 * 1. Channel/DM/thread screens use KeyboardAvoidingView from
 *    react-native-keyboard-controller (native animation curves).
 * 2. MessageInput components do NOT contain their own keyboard avoidance
 *    wrappers (which would cause double-avoidance when rendered inside
 *    a screen's KeyboardAvoidingView).
 * 3. App root provides KeyboardProvider.
 */
import React from "react";
import * as fs from "fs";
import * as path from "path";
import { render } from "@testing-library/react-native";
import { MessageInput } from "../MessageInput";
import { MessageInputVariantA } from "../MessageInputVariantA";

jest.mock("@/hooks/useDraftRestoration", () => {
  const actual = jest.requireActual("@/hooks/useDraftRestoration");
  return {
    useDraftRestoration: (opts: Parameters<typeof actual.useDraftRestoration>[0]) => {
      const result = actual.useDraftRestoration(opts);
      return { ...result, clearDraft: jest.fn(), saveDraft: jest.fn() };
    },
  };
});

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

/**
 * Walk a rendered JSON tree and check if any node has a testID matching one
 * of the keyboard-avoidance wrapper testIDs from our mocks.
 */
function findKeyboardWrappers(node: ReturnType<typeof render>["toJSON"]): string[] {
  const found: string[] = [];
  function walk(n: unknown) {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    const obj = n as Record<string, unknown>;
    const props = obj.props as Record<string, unknown> | undefined;
    const testID = props?.testID as string | undefined;
    if (testID === "keyboard-sticky-view" || testID === "kc-keyboard-avoiding-view") {
      found.push(testID);
    }
    const children = obj.children;
    if (Array.isArray(children)) children.forEach(walk);
  }
  walk(node);
  return found;
}

describe("No double keyboard avoidance in MessageInput", () => {
  it("MessageInput does not contain keyboard avoidance wrappers", () => {
    const { toJSON } = render(<MessageInput onSend={jest.fn()} />);
    const wrappers = findKeyboardWrappers(toJSON());
    expect(wrappers).toEqual([]);
  });

  it("MessageInputVariantA does not contain keyboard avoidance wrappers", () => {
    const { toJSON } = render(<MessageInputVariantA onSend={jest.fn()} />);
    const wrappers = findKeyboardWrappers(toJSON());
    expect(wrappers).toEqual([]);
  });
});
