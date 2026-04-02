import { describe, it, expect } from "bun:test";
import { loadYoga, Direction } from "yoga-layout/load";
import type { Yoga } from "yoga-layout/load";
import { applyStyles } from "../style-mapper";

let yoga: Yoga;

// Load yoga once
yoga = await loadYoga();

function createLayoutTest(
  parentStyle: Record<string, unknown>,
  childStyles: Record<string, unknown>[],
  parentWidth = 100,
  parentHeight = 100,
) {
  const root = yoga.Node.create();
  applyStyles(root, parentStyle);
  root.setWidth(parentWidth);
  root.setHeight(parentHeight);

  const children = childStyles.map((style, i) => {
    const child = yoga.Node.create();
    applyStyles(child, style);
    root.insertChild(child, i);
    return child;
  });

  root.calculateLayout(undefined, undefined, Direction.LTR);

  const results = children.map((c) => ({
    left: c.getComputedLeft(),
    top: c.getComputedTop(),
    width: c.getComputedWidth(),
    height: c.getComputedHeight(),
  }));

  root.freeRecursive();
  return results;
}

describe("applyStyles", () => {
  describe("flex direction", () => {
    it("maps flexDirection: row", () => {
      const results = createLayoutTest(
        { flexDirection: "row" },
        [{ width: 30, height: 30 }, { width: 30, height: 30 }],
      );
      expect(results[0]!.left).toBe(0);
      expect(results[1]!.left).toBe(30);
      expect(results[1]!.top).toBe(0);
    });

    it("maps flexDirection: column (default)", () => {
      const results = createLayoutTest(
        {},
        [{ width: 30, height: 30 }, { width: 30, height: 30 }],
      );
      expect(results[0]!.top).toBe(0);
      expect(results[1]!.top).toBe(30);
      expect(results[1]!.left).toBe(0);
    });

    it("maps flexDirection: row-reverse", () => {
      const results = createLayoutTest(
        { flexDirection: "row-reverse" },
        [{ width: 30, height: 30 }, { width: 30, height: 30 }],
      );
      expect(results[0]!.left).toBe(70);
      expect(results[1]!.left).toBe(40);
    });
  });

  describe("justifyContent", () => {
    it("maps center", () => {
      const results = createLayoutTest(
        { justifyContent: "center" },
        [{ width: 100, height: 20 }],
      );
      expect(results[0]!.top).toBe(40);
    });

    it("maps space-between", () => {
      const results = createLayoutTest(
        { justifyContent: "space-between" },
        [{ width: 100, height: 20 }, { width: 100, height: 20 }],
      );
      expect(results[0]!.top).toBe(0);
      expect(results[1]!.top).toBe(80);
    });
  });

  describe("alignItems", () => {
    it("maps center", () => {
      const results = createLayoutTest(
        { alignItems: "center" },
        [{ width: 50, height: 50 }],
      );
      expect(results[0]!.left).toBe(25);
    });

    it("maps flex-end", () => {
      const results = createLayoutTest(
        { alignItems: "flex-end" },
        [{ width: 50, height: 50 }],
      );
      expect(results[0]!.left).toBe(50);
    });
  });

  describe("dimensions", () => {
    it("maps width and height as numbers", () => {
      const results = createLayoutTest({}, [{ width: 60, height: 40 }]);
      expect(results[0]!.width).toBe(60);
      expect(results[0]!.height).toBe(40);
    });

    it("maps percentage width", () => {
      const results = createLayoutTest({}, [{ width: "50%", height: 40 }]);
      expect(results[0]!.width).toBe(50);
    });

    it("maps minWidth and maxWidth", () => {
      const results = createLayoutTest({}, [
        { width: 200, maxWidth: 80, height: 40 },
      ]);
      expect(results[0]!.width).toBe(80);
    });

    it("maps minHeight and maxHeight", () => {
      const results = createLayoutTest({}, [
        { width: 40, height: 10, minHeight: 30 },
      ]);
      expect(results[0]!.height).toBe(30);
    });
  });

  describe("flex props", () => {
    it("maps flex: 1", () => {
      const results = createLayoutTest(
        {},
        [{ flex: 1 }, { flex: 1 }],
      );
      expect(results[0]!.height).toBe(50);
      expect(results[1]!.height).toBe(50);
    });

    it("maps flexGrow", () => {
      const results = createLayoutTest(
        {},
        [{ flexGrow: 1, height: 10 }, { flexGrow: 2, height: 10 }],
      );
      // flexGrow distributes remaining 80px (100 - 10 - 10) as 1:2
      expect(results[0]!.height).toBeCloseTo(10 + 80 / 3, 0);
      expect(results[1]!.height).toBeCloseTo(10 + 160 / 3, 0);
    });
  });

  describe("margin", () => {
    it("maps marginTop", () => {
      const results = createLayoutTest({}, [
        { width: 50, height: 50, marginTop: 10 },
      ]);
      expect(results[0]!.top).toBe(10);
    });

    it("maps marginHorizontal", () => {
      const results = createLayoutTest(
        { flexDirection: "row" },
        [{ width: 50, height: 50, marginHorizontal: 10 }],
      );
      expect(results[0]!.left).toBe(10);
      expect(results[0]!.width).toBe(50);
    });

    it("maps margin (all sides)", () => {
      const results = createLayoutTest({}, [
        { width: 50, height: 50, margin: 15 },
      ]);
      expect(results[0]!.top).toBe(15);
      expect(results[0]!.left).toBe(15);
    });
  });

  describe("padding", () => {
    it("maps paddingTop", () => {
      const results = createLayoutTest(
        { paddingTop: 20 },
        [{ width: 50, height: 50 }],
      );
      expect(results[0]!.top).toBe(20);
    });

    it("maps paddingHorizontal", () => {
      const results = createLayoutTest(
        { paddingHorizontal: 10, flexDirection: "row" },
        [{ flexGrow: 1, height: 50 }],
      );
      expect(results[0]!.left).toBe(10);
      expect(results[0]!.width).toBe(80); // 100 - 10 - 10
    });
  });

  describe("position", () => {
    it("maps position: absolute with top/left", () => {
      const results = createLayoutTest({}, [
        { position: "absolute", top: 10, left: 20, width: 50, height: 50 },
      ]);
      expect(results[0]!.top).toBe(10);
      expect(results[0]!.left).toBe(20);
    });
  });

  describe("gap", () => {
    it("maps gap between children", () => {
      const results = createLayoutTest(
        { gap: 10 },
        [{ width: 50, height: 20 }, { width: 50, height: 20 }],
      );
      expect(results[0]!.top).toBe(0);
      expect(results[1]!.top).toBe(30); // 20 + 10 gap
    });

    it("maps rowGap", () => {
      const results = createLayoutTest(
        { rowGap: 15 },
        [{ width: 50, height: 20 }, { width: 50, height: 20 }],
      );
      expect(results[1]!.top).toBe(35); // 20 + 15 gap
    });
  });

  describe("border width", () => {
    it("maps borderWidth affecting child layout", () => {
      const results = createLayoutTest(
        { borderWidth: 5 },
        [{ width: 50, height: 50 }],
      );
      expect(results[0]!.top).toBe(5);
      expect(results[0]!.left).toBe(5);
    });
  });

  describe("display", () => {
    it("maps display: none", () => {
      const results = createLayoutTest({}, [
        { width: 50, height: 50, display: "none" },
        { width: 50, height: 50 },
      ]);
      // First child hidden, second child takes its place
      expect(results[1]!.top).toBe(0);
    });
  });

  describe("overflow", () => {
    it("maps overflow: hidden", () => {
      const node = yoga.Node.create();
      applyStyles(node, { overflow: "hidden" });
      expect(node.getOverflow()).toBe(1); // Overflow.Hidden
      node.free();
    });
  });

  describe("aspectRatio", () => {
    it("maps aspectRatio", () => {
      const results = createLayoutTest({}, [
        { width: 50, aspectRatio: 2 },
      ]);
      expect(results[0]!.width).toBe(50);
      expect(results[0]!.height).toBe(25); // width / aspectRatio
    });
  });

  describe("flexWrap", () => {
    it("maps flexWrap: wrap", () => {
      const results = createLayoutTest(
        { flexDirection: "row", flexWrap: "wrap" },
        [
          { width: 60, height: 30 },
          { width: 60, height: 30 },
        ],
        100,
        100,
      );
      // Second child wraps to next row
      expect(results[1]!.top).toBe(30);
      expect(results[1]!.left).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles undefined style gracefully", () => {
      const node = yoga.Node.create();
      applyStyles(node, undefined);
      node.free();
    });

    it("ignores unknown style props", () => {
      const node = yoga.Node.create();
      applyStyles(node, { backgroundColor: "red", opacity: 0.5 });
      node.free();
    });
  });
});
