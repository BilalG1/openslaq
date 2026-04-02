/** The RNTL tree shape (matches react-test-renderer's ReactTestRendererJSON) */
export interface RNTreeNode {
  type: string;
  props: Record<string, unknown>;
  children: (RNTreeNode | string)[] | null;
}

/** Computed layout rectangle for a single node */
export interface LayoutRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A layout result entry with metadata */
export interface LayoutEntry extends LayoutRect {
  testID?: string;
  type: string;
  children: LayoutEntry[];
}

/** The full result returned by computeLayout */
export interface LayoutResult {
  root: LayoutEntry;
  /** Flat map of testID -> LayoutRect for quick assertions */
  byTestID: Map<string, LayoutRect>;
}

/** Options for computeLayout */
export interface ComputeLayoutOptions {
  /** Root container width in pixels (default: 390 = iPhone 15) */
  width?: number;
  /** Root container height in pixels (default: 844) */
  height?: number;
  /** Characters per line for text measurement heuristic (default: 45) */
  charsPerLine?: number;
  /** Line height in pixels for text measurement (default: 20) */
  lineHeight?: number;
}
