import { describe, it, expect } from "bun:test";
import { computeLayout } from "../compute-layout";
import type { RNTreeNode } from "../types";

describe("computeLayout", () => {
  it("returns empty result for null tree", async () => {
    const result = await computeLayout(null);
    expect(result.byTestID.size).toBe(0);
  });

  it("computes basic flex layout", async () => {
    const tree: RNTreeNode = {
      type: "View",
      props: { style: { flex: 1 }, testID: "root" },
      children: [
        {
          type: "View",
          props: { style: { height: 100 }, testID: "header" },
          children: null,
        },
        {
          type: "View",
          props: { style: { flex: 1 }, testID: "body" },
          children: null,
        },
      ],
    };

    const result = await computeLayout(tree, { width: 390, height: 844 });

    expect(result.byTestID.get("root")!.width).toBe(390);
    expect(result.byTestID.get("root")!.height).toBe(844);
    expect(result.byTestID.get("header")!.height).toBe(100);
    expect(result.byTestID.get("header")!.top).toBe(0);
    expect(result.byTestID.get("body")!.height).toBe(744);
    expect(result.byTestID.get("body")!.top).toBe(100);
  });

  it("computes absolute positions through nested tree", async () => {
    const tree: RNTreeNode = {
      type: "View",
      props: { style: { flex: 1 }, testID: "root" },
      children: [
        {
          type: "View",
          props: {
            style: { marginTop: 50, height: 200 },
            testID: "parent",
          },
          children: [
            {
              type: "View",
              props: {
                style: { marginTop: 20, height: 50 },
                testID: "child",
              },
              children: null,
            },
          ],
        },
      ],
    };

    const result = await computeLayout(tree, { width: 390, height: 844 });

    expect(result.byTestID.get("parent")!.top).toBe(50);
    expect(result.byTestID.get("child")!.top).toBe(70); // 50 + 20
  });

  it("handles array of root nodes", async () => {
    const trees: RNTreeNode[] = [
      {
        type: "View",
        props: { style: { height: 100 }, testID: "a" },
        children: null,
      },
      {
        type: "View",
        props: { style: { height: 100 }, testID: "b" },
        children: null,
      },
    ];

    const result = await computeLayout(trees, { width: 390, height: 844 });
    expect(result.byTestID.get("a")!.top).toBe(0);
    expect(result.byTestID.get("b")!.top).toBe(100);
  });

  it("computes Text node dimensions", async () => {
    const tree: RNTreeNode = {
      type: "View",
      props: { style: { width: 200, height: 200 }, testID: "root" },
      children: [
        {
          type: "Text",
          props: { testID: "label" },
          children: ["Hello"],
        },
      ],
    };

    const result = await computeLayout(tree, { width: 200, height: 200 });
    const label = result.byTestID.get("label")!;
    // Default alignItems:stretch makes text fill parent width
    expect(label.width).toBe(200);
    expect(label.height).toBe(20); // 1 line
  });

  it("detects layout difference from flex:1 vs paddingTop style change", async () => {
    // This simulates the ChannelMessageList bug
    const makeTree = (
      contentContainerStyle: Record<string, unknown>,
    ): RNTreeNode => ({
      type: "View",
      props: { style: { flex: 1 }, testID: "message-list" },
      children: [
        {
          type: "View",
          props: { style: contentContainerStyle, testID: "content-container" },
          children: [
            {
              type: "View",
              props: { style: { height: 60 }, testID: "message" },
              children: null,
            },
          ],
        },
      ],
    });

    const withFlex1 = await computeLayout(
      makeTree({ flex: 1 }),
      { width: 390, height: 844 },
    );
    const withPaddingTop = await computeLayout(
      makeTree({ paddingTop: 24 }),
      { width: 390, height: 844 },
    );

    // With flex:1 the content container stretches to fill
    const flex1Container = withFlex1.byTestID.get("content-container")!;
    // With paddingTop:24 the content container only wraps content
    const padContainer = withPaddingTop.byTestID.get("content-container")!;

    // These produce different layouts - that's the bug
    expect(flex1Container.height).not.toBe(padContainer.height);
  });
});
