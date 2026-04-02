import { describe, it, expect } from "bun:test";
import { loadYoga, Direction } from "yoga-layout/load";
import type { Yoga } from "yoga-layout/load";
import { buildYogaTree } from "../tree-walker";
import type { RNTreeNode } from "../types";

let yoga: Yoga;
yoga = await loadYoga();

const measOpts = { charsPerLine: 45, lineHeight: 20 };

describe("buildYogaTree", () => {
  it("creates a single node with styles", () => {
    const tree: RNTreeNode = {
      type: "View",
      props: { style: { width: 100, height: 50 } },
      children: null,
    };
    const node = buildYogaTree(yoga, tree, measOpts);
    node.calculateLayout(undefined, undefined, Direction.LTR);
    expect(node.getComputedWidth()).toBe(100);
    expect(node.getComputedHeight()).toBe(50);
    node.freeRecursive();
  });

  it("creates nested nodes", () => {
    const tree: RNTreeNode = {
      type: "View",
      props: { style: { width: 200, height: 200 } },
      children: [
        {
          type: "View",
          props: { style: { width: 100, height: 50 }, testID: "child" },
          children: null,
        },
      ],
    };
    const node = buildYogaTree(yoga, tree, measOpts);
    node.calculateLayout(undefined, undefined, Direction.LTR);
    expect(node.getChildCount()).toBe(1);
    const child = node.getChild(0);
    expect(child.getComputedWidth()).toBe(100);
    expect(child.getComputedHeight()).toBe(50);
    node.freeRecursive();
  });

  it("handles Text nodes with measureFunc", () => {
    const tree: RNTreeNode = {
      type: "View",
      props: { style: { width: 200, height: 200 } },
      children: [
        {
          type: "Text",
          props: {},
          children: ["Hello World"],
        },
      ],
    };
    const node = buildYogaTree(yoga, tree, measOpts);
    node.calculateLayout(undefined, undefined, Direction.LTR);
    const text = node.getChild(0);
    // Default alignItems:stretch makes text fill parent width
    expect(text.getComputedWidth()).toBe(200);
    expect(text.getComputedHeight()).toBe(20);
    node.freeRecursive();
  });

  it("skips bare string children in non-Text nodes", () => {
    const tree: RNTreeNode = {
      type: "View",
      props: { style: { width: 100, height: 100 } },
      children: [
        "bare string",
        {
          type: "View",
          props: { style: { height: 30 } },
          children: null,
        },
      ],
    };
    const node = buildYogaTree(yoga, tree, measOpts);
    expect(node.getChildCount()).toBe(1);
    node.freeRecursive();
  });

  it("flattens style arrays", () => {
    const tree: RNTreeNode = {
      type: "View",
      props: {
        style: [{ width: 100 }, { height: 50 }],
      },
      children: null,
    };
    const node = buildYogaTree(yoga, tree, measOpts);
    node.calculateLayout(undefined, undefined, Direction.LTR);
    expect(node.getComputedWidth()).toBe(100);
    expect(node.getComputedHeight()).toBe(50);
    node.freeRecursive();
  });

  it("handles undefined style", () => {
    const tree: RNTreeNode = {
      type: "View",
      props: {},
      children: null,
    };
    const node = buildYogaTree(yoga, tree, measOpts);
    node.calculateLayout(100, 100, Direction.LTR);
    expect(node.getComputedWidth()).toBe(100);
    node.freeRecursive();
  });
});
