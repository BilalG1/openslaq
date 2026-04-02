import { loadYoga, Direction } from "yoga-layout/load";
import type { Yoga, Node as YogaNode } from "yoga-layout/load";
import type {
  RNTreeNode,
  LayoutResult,
  LayoutEntry,
  LayoutRect,
  ComputeLayoutOptions,
} from "./types";
import { buildYogaTree } from "./tree-walker";

let yogaInstance: Yoga | null = null;

async function getYoga(): Promise<Yoga> {
  if (!yogaInstance) yogaInstance = await loadYoga();
  return yogaInstance;
}

function emptyEntry(): LayoutEntry {
  return {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    type: "empty",
    children: [],
  };
}

function extractLayout(
  rnNode: RNTreeNode,
  yogaNode: YogaNode,
  parentAbsLeft: number,
  parentAbsTop: number,
  byTestID: Map<string, LayoutRect>,
): LayoutEntry {
  const left = parentAbsLeft + yogaNode.getComputedLeft();
  const top = parentAbsTop + yogaNode.getComputedTop();
  const width = yogaNode.getComputedWidth();
  const height = yogaNode.getComputedHeight();
  const rect: LayoutRect = { left, top, width, height };

  const testID = rnNode.props.testID as string | undefined;
  if (testID) byTestID.set(testID, rect);

  const children: LayoutEntry[] = [];
  let childIdx = 0;
  if (rnNode.children) {
    for (const child of rnNode.children) {
      if (typeof child === "string") continue;
      if (childIdx < yogaNode.getChildCount()) {
        children.push(
          extractLayout(
            child,
            yogaNode.getChild(childIdx),
            left,
            top,
            byTestID,
          ),
        );
        childIdx++;
      }
    }
  }

  return { ...rect, testID, type: rnNode.type, children };
}

export async function computeLayout(
  tree: RNTreeNode | RNTreeNode[] | null,
  options?: ComputeLayoutOptions,
): Promise<LayoutResult> {
  if (!tree) return { root: emptyEntry(), byTestID: new Map() };

  const yoga = await getYoga();
  const width = options?.width ?? 390;
  const height = options?.height ?? 844;
  const measOpts = {
    charsPerLine: options?.charsPerLine ?? 45,
    lineHeight: options?.lineHeight ?? 20,
  };

  const nodes = Array.isArray(tree) ? tree : [tree];
  const syntheticRoot: RNTreeNode =
    nodes.length === 1
      ? nodes[0]!
      : { type: "View", props: {}, children: nodes };

  const rootYogaNode = buildYogaTree(yoga, syntheticRoot, measOpts);
  rootYogaNode.setWidth(width);
  rootYogaNode.setHeight(height);

  try {
    rootYogaNode.calculateLayout(undefined, undefined, Direction.LTR);
    const byTestID = new Map<string, LayoutRect>();
    const root = extractLayout(syntheticRoot, rootYogaNode, 0, 0, byTestID);
    return { root, byTestID };
  } finally {
    rootYogaNode.freeRecursive();
  }
}
