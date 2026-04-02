import React from "react";
import { View, Text } from "react-native";
import { render } from "@testing-library/react-native";
import { computeLayout } from "@openslaq/rn-layout-testing";
import { EmptyState } from "../ui/EmptyState";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        textFaint: "#999",
      },
    },
  }),
}));

const SCREEN_W = 390;
const SCREEN_H = 844;

describe("EmptyState layout", () => {
  it("container fills available width", async () => {
    const { toJSON } = render(
      <EmptyState testID="empty" message="No messages yet" />,
    );
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });

    const empty = layout.byTestID.get("empty");
    expect(empty).toBeDefined();
    expect(empty!.width).toBe(SCREEN_W);
  });

  it("container fills available height (flex: 1)", async () => {
    const { toJSON } = render(
      <EmptyState testID="empty" message="No messages yet" />,
    );
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });

    const empty = layout.byTestID.get("empty");
    expect(empty).toBeDefined();
    expect(empty!.height).toBe(SCREEN_H);
  });

  it("message text is horizontally centered", async () => {
    const { toJSON } = render(
      <EmptyState testID="empty" message="No messages yet" />,
    );
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });

    const empty = layout.byTestID.get("empty")!;

    // Find the Text node (message)
    function findText(entry: typeof layout.root): typeof layout.root | null {
      if (entry.type === "Text") return entry;
      for (const child of entry.children) {
        const found = findText(child);
        if (found) return found;
      }
      return null;
    }
    const text = findText(layout.root);
    expect(text).not.toBeNull();

    // Text should be centered horizontally
    // With alignItems: "center", the text's horizontal center should match container center
    const textCenter = text!.left + text!.width / 2;
    const containerCenter = empty.left + empty.width / 2;
    expect(Math.abs(textCenter - containerCenter)).toBeLessThan(1);
  });

  it("message text is vertically centered", async () => {
    const { toJSON } = render(
      <EmptyState testID="empty" message="No messages yet" />,
    );
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });

    const empty = layout.byTestID.get("empty")!;

    // Find the Text node
    function findText(entry: typeof layout.root): typeof layout.root | null {
      if (entry.type === "Text") return entry;
      for (const child of entry.children) {
        const found = findText(child);
        if (found) return found;
      }
      return null;
    }
    const text = findText(layout.root);
    expect(text).not.toBeNull();

    // Text should be roughly centered vertically (justifyContent: "center")
    const textCenter = text!.top + text!.height / 2;
    const containerCenter = empty.top + empty.height / 2;
    // Allow some tolerance due to paddingVertical: 48
    expect(Math.abs(textCenter - containerCenter)).toBeLessThan(2);
  });

  it("icon appears above message text when provided", async () => {
    const icon = <View testID="test-icon" style={{ width: 48, height: 48 }} />;
    const { toJSON } = render(
      <EmptyState testID="empty" message="Nothing here" icon={icon} />,
    );
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });

    const iconNode = layout.byTestID.get("test-icon");
    expect(iconNode).toBeDefined();
    expect(iconNode!.width).toBe(48);
    expect(iconNode!.height).toBe(48);

    // Find the Text node for the message
    function findText(entry: typeof layout.root): typeof layout.root | null {
      if (entry.type === "Text") return entry;
      for (const child of entry.children) {
        const found = findText(child);
        if (found) return found;
      }
      return null;
    }
    const text = findText(layout.root);
    expect(text).not.toBeNull();

    // Icon should be above the text (lower top value)
    expect(iconNode!.top).toBeLessThan(text!.top);
    // Icon and text should be horizontally centered (both centered on container)
    const iconCenter = iconNode!.left + iconNode!.width / 2;
    const textCenter = text!.left + text!.width / 2;
    expect(Math.abs(iconCenter - textCenter)).toBeLessThan(2);
  });

  it("icon has 12px margin below it (spacing from message text)", async () => {
    const icon = <View testID="test-icon" style={{ width: 48, height: 48 }} />;
    const { toJSON } = render(
      <EmptyState testID="empty" message="Nothing here" icon={icon} />,
    );
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });

    const iconNode = layout.byTestID.get("test-icon")!;

    // The icon is inside an iconWrapper with marginBottom: 12
    // Find the text to check the gap
    function findText(entry: typeof layout.root): typeof layout.root | null {
      if (entry.type === "Text") return entry;
      for (const child of entry.children) {
        const found = findText(child);
        if (found) return found;
      }
      return null;
    }
    const text = findText(layout.root);
    expect(text).not.toBeNull();

    // Gap between icon bottom and text top should be exactly 12 (marginBottom on wrapper)
    const gap = text!.top - (iconNode!.top + iconNode!.height);
    expect(gap).toBe(12);
  });
});
