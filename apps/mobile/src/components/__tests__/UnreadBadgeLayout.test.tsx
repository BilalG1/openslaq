import React from "react";
import { View } from "react-native";
import { render } from "@testing-library/react-native";
import { computeLayout } from "@openslaq/rn-layout-testing";
import { UnreadBadge } from "../ui/UnreadBadge";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      interaction: {
        badgeUnreadBg: "#e01e5a",
        badgeUnreadText: "#ffffff",
      },
    },
  }),
}));

describe("UnreadBadge layout", () => {
  it("returns null for count <= 0", () => {
    const { toJSON } = render(<UnreadBadge count={0} />);
    expect(toJSON()).toBeNull();
  });

  it("badge has minimum width of 20px and height of 20px", async () => {
    const { toJSON } = render(
      <View testID="parent" style={{ width: 100, height: 40 }}>
        <UnreadBadge count={1} />
      </View>,
    );
    const layout = await computeLayout(toJSON(), { width: 100, height: 40 });

    // Find the badge — it's the View with minWidth: 20, height: 20
    const root = layout.root;
    // Walk tree to find the badge (has height 20)
    function findBadge(entry: typeof root): typeof root | null {
      if (entry.height === 20 && entry.type === "View") return entry;
      for (const child of entry.children) {
        const found = findBadge(child);
        if (found) return found;
      }
      return null;
    }
    const badge = findBadge(root);
    expect(badge).not.toBeNull();
    expect(badge!.height).toBe(20);
    expect(badge!.width).toBeGreaterThanOrEqual(20);
  });

  it("badge width grows for larger numbers", async () => {
    const { toJSON: small } = render(
      <View testID="p1" style={{ width: 200, height: 40, flexDirection: "row" }}>
        <UnreadBadge count={1} />
      </View>,
    );
    const smallLayout = await computeLayout(small(), { width: 200, height: 40 });

    const { toJSON: large } = render(
      <View testID="p2" style={{ width: 200, height: 40, flexDirection: "row" }}>
        <UnreadBadge count={99} />
      </View>,
    );
    const largeLayout = await computeLayout(large(), { width: 200, height: 40 });

    // Find badges by walking
    function findFirstViewWithHeight(entry: any, h: number): any {
      if (entry.height === h && entry.type === "View") return entry;
      for (const child of entry.children) {
        const found = findFirstViewWithHeight(child, h);
        if (found) return found;
      }
      return null;
    }

    const smallBadge = findFirstViewWithHeight(smallLayout.root, 20);
    const largeBadge = findFirstViewWithHeight(largeLayout.root, 20);

    expect(smallBadge).not.toBeNull();
    expect(largeBadge).not.toBeNull();
    // "99" should be wider than "1" due to text content + paddingHorizontal: 6
    expect(largeBadge.width).toBeGreaterThan(smallBadge.width);
  });

  it("badge text is centered (alignItems + justifyContent: center)", async () => {
    // The badge View has alignItems: "center" and justifyContent: "center"
    // We verify the text is horizontally centered within the badge
    const { toJSON } = render(
      <View testID="parent" style={{ width: 200, height: 40, flexDirection: "row" }}>
        <UnreadBadge count={5} />
      </View>,
    );
    const layout = await computeLayout(toJSON(), { width: 200, height: 40 });

    // Find badge and its text child
    function findBadgeAndText(entry: any): { badge: any; text: any } | null {
      if (entry.height === 20 && entry.type === "View" && entry.children.length > 0) {
        const text = entry.children.find((c: any) => c.type === "Text");
        if (text) return { badge: entry, text };
      }
      for (const child of entry.children) {
        const found = findBadgeAndText(child);
        if (found) return found;
      }
      return null;
    }
    const result = findBadgeAndText(layout.root);
    expect(result).not.toBeNull();

    const { badge, text } = result!;
    // Text should be horizontally centered within the badge
    const textCenter = text.left + text.width / 2;
    const badgeCenter = badge.left + badge.width / 2;
    expect(Math.abs(textCenter - badgeCenter)).toBeLessThan(2);
  });
});
