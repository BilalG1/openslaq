import type { Yoga, Node as YogaNode } from "yoga-layout/load";
import type { RNTreeNode } from "./types";
import { applyStyles } from "./style-mapper";
import {
  createTextMeasureFunc,
  extractTextContent,
  type TextMeasureOptions,
} from "./text-measure";

const TEXT_TYPES = new Set(["Text", "RCTText", "RCTVirtualText"]);

/** Flatten RN style prop (handles arrays, undefined) */
function normalizeStyle(
  style: unknown,
): Record<string, unknown> | undefined {
  if (!style) return undefined;
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean)) as Record<
      string,
      unknown
    >;
  }
  return style as Record<string, unknown>;
}

export function buildYogaTree(
  yoga: Yoga,
  rnNode: RNTreeNode,
  measOpts: TextMeasureOptions,
): YogaNode {
  const yogaNode = yoga.Node.create();
  const style = normalizeStyle(rnNode.props.style);
  applyStyles(yogaNode, style);

  // Text nodes: use measureFunc for intrinsic sizing
  if (TEXT_TYPES.has(rnNode.type)) {
    const text = extractTextContent(rnNode);
    yogaNode.setMeasureFunc(createTextMeasureFunc(text, measOpts));
    return yogaNode;
  }

  // Process children
  if (rnNode.children) {
    let childIndex = 0;
    for (const child of rnNode.children) {
      if (typeof child === "string") continue;
      const childYogaNode = buildYogaTree(yoga, child, measOpts);
      yogaNode.insertChild(childYogaNode, childIndex++);
    }
  }

  return yogaNode;
}
