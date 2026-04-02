import React from "react";
import { render } from "@testing-library/react-native";
import { computeLayout } from "@openslaq/rn-layout-testing";
import { FilterChips } from "../search/FilterChips";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        textSecondary: "#666",
        borderDefault: "#ddd",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

/**
 * Inject horizontal flexDirection and contentContainerStyle into RCTScrollView's
 * inner content View.
 */
function injectScrollContentStyle(tree: any): any {
  function walk(node: any) {
    if (!node || typeof node === "string") return;
    if (node.type === "RCTScrollView") {
      const ccs = node.props?.contentContainerStyle ?? {};
      const horizontal = node.props?.horizontal ? { flexDirection: "row" } : {};
      if (node.children?.[0] && typeof node.children[0] !== "string") {
        node.children[0].props = {
          ...node.children[0].props,
          style: {
            ...(node.children[0].props?.style ?? {}),
            ...horizontal,
            ...ccs,
          },
        };
      }
    }
    if (Array.isArray(node.children)) {
      node.children.forEach(walk);
    }
  }
  walk(tree);
  return tree;
}

function makeChip(key: string, value?: string) {
  return {
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value,
    onPress: jest.fn(),
    onClear: jest.fn(),
  };
}

const SCREEN_W = 390;

describe("FilterChips layout", () => {
  it("chips are laid out horizontally", async () => {
    const chips = [makeChip("channel"), makeChip("from"), makeChip("date")];
    const { toJSON } = render(<FilterChips chips={chips} />);
    const layout = await computeLayout(injectScrollContentStyle(toJSON()), {
      width: SCREEN_W,
      height: 60,
    });

    const c1 = layout.byTestID.get("filter-chip-channel")!;
    const c2 = layout.byTestID.get("filter-chip-from")!;
    const c3 = layout.byTestID.get("filter-chip-date")!;

    expect(c1).toBeDefined();
    expect(c2).toBeDefined();
    expect(c3).toBeDefined();

    // Each chip should be to the right of the previous
    expect(c2.left).toBeGreaterThan(c1.left);
    expect(c3.left).toBeGreaterThan(c2.left);
  });

  it("chips have consistent vertical alignment", async () => {
    const chips = [makeChip("channel"), makeChip("from"), makeChip("date")];
    const { toJSON } = render(<FilterChips chips={chips} />);
    const layout = await computeLayout(injectScrollContentStyle(toJSON()), {
      width: SCREEN_W,
      height: 60,
    });

    const tops = ["channel", "from", "date"].map(
      (k) => layout.byTestID.get(`filter-chip-${k}`)!.top,
    );
    expect(tops[1]).toBe(tops[0]);
    expect(tops[2]).toBe(tops[0]);
  });

  it("active chip with clear button is wider than inactive chip with same label", async () => {
    const inactive = [makeChip("from")];
    const active = [makeChip("from", "Alice")];

    const { toJSON: inactiveTree } = render(<FilterChips chips={inactive} />);
    const inactiveLayout = await computeLayout(
      injectScrollContentStyle(inactiveTree()),
      { width: SCREEN_W, height: 60 },
    );

    const { toJSON: activeTree } = render(<FilterChips chips={active} />);
    const activeLayout = await computeLayout(
      injectScrollContentStyle(activeTree()),
      { width: SCREEN_W, height: 60 },
    );

    const inactiveChip = inactiveLayout.byTestID.get("filter-chip-from")!;
    const activeChip = activeLayout.byTestID.get("filter-chip-from")!;

    // Active chip has a clear button, so should be wider
    // (also "Alice" is longer than "From" so text is wider too)
    expect(activeChip.width).toBeGreaterThan(inactiveChip.width);
  });

  it("clear button appears only on active chips", async () => {
    const chips = [
      makeChip("channel"),
      makeChip("from", "Alice"),
    ];
    const { toJSON } = render(<FilterChips chips={chips} />);
    const layout = await computeLayout(injectScrollContentStyle(toJSON()), {
      width: SCREEN_W,
      height: 60,
    });

    // Inactive chip has no clear button
    const clearInactive = layout.byTestID.get("filter-chip-clear-channel");
    expect(clearInactive).toBeUndefined();

    // Active chip has clear button
    const clearActive = layout.byTestID.get("filter-chip-clear-from");
    expect(clearActive).toBeDefined();
  });

  it("chips have gap spacing between them", async () => {
    const chips = [makeChip("channel"), makeChip("from")];
    const { toJSON } = render(<FilterChips chips={chips} />);
    const layout = await computeLayout(injectScrollContentStyle(toJSON()), {
      width: SCREEN_W,
      height: 60,
    });

    const c1 = layout.byTestID.get("filter-chip-channel")!;
    const c2 = layout.byTestID.get("filter-chip-from")!;

    // The chipRow Views containing the Pressables should have gap between them
    // scrollContent has gap: 8
    const gapBetween = c2.left - (c1.left + c1.width);
    expect(gapBetween).toBeGreaterThanOrEqual(8);
  });
});
