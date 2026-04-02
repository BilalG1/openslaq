import type { Node as YogaNode } from "yoga-layout/load";
import {
  Align,
  BoxSizing,
  Display,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
  Overflow,
  PositionType,
  Wrap,
} from "yoga-layout/load";

const FLEX_DIRECTION: Record<string, FlexDirection> = {
  row: FlexDirection.Row,
  "row-reverse": FlexDirection.RowReverse,
  column: FlexDirection.Column,
  "column-reverse": FlexDirection.ColumnReverse,
};

const JUSTIFY: Record<string, Justify> = {
  "flex-start": Justify.FlexStart,
  "flex-end": Justify.FlexEnd,
  center: Justify.Center,
  "space-between": Justify.SpaceBetween,
  "space-around": Justify.SpaceAround,
  "space-evenly": Justify.SpaceEvenly,
};

const ALIGN: Record<string, Align> = {
  auto: Align.Auto,
  "flex-start": Align.FlexStart,
  "flex-end": Align.FlexEnd,
  center: Align.Center,
  stretch: Align.Stretch,
  baseline: Align.Baseline,
  "space-between": Align.SpaceBetween,
  "space-around": Align.SpaceAround,
  "space-evenly": Align.SpaceEvenly,
};

const DISPLAY: Record<string, Display> = {
  flex: Display.Flex,
  none: Display.None,
  contents: Display.Contents,
};

const OVERFLOW_MAP: Record<string, Overflow> = {
  visible: Overflow.Visible,
  hidden: Overflow.Hidden,
  scroll: Overflow.Scroll,
};

const POSITION: Record<string, PositionType> = {
  static: PositionType.Static,
  relative: PositionType.Relative,
  absolute: PositionType.Absolute,
};

const WRAP_MAP: Record<string, Wrap> = {
  nowrap: Wrap.NoWrap,
  wrap: Wrap.Wrap,
  "wrap-reverse": Wrap.WrapReverse,
};

const BOX_SIZING: Record<string, BoxSizing> = {
  "border-box": BoxSizing.BorderBox,
  "content-box": BoxSizing.ContentBox,
};

type DimensionValue = number | string | undefined | null;

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** Convert an RN style value to the format Yoga setters accept */
function toDimensionArg(
  value: DimensionValue,
): number | "auto" | `${number}%` | undefined {
  if (!isDefined(value)) return undefined;
  if (typeof value === "number") return value;
  if (value === "auto") return "auto";
  if (typeof value === "string" && value.endsWith("%")) {
    return value as `${number}%`;
  }
  // Animated values: try to extract current value
  if (
    typeof value === "object" &&
    value !== null &&
    "__getValue" in (value as Record<string, unknown>)
  ) {
    const extracted = (value as { __getValue: () => unknown }).__getValue();
    if (typeof extracted === "number") return extracted;
  }
  return undefined;
}

function toNumberArg(value: DimensionValue): number | undefined {
  if (typeof value === "number") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "__getValue" in (value as Record<string, unknown>)
  ) {
    const extracted = (value as { __getValue: () => unknown }).__getValue();
    if (typeof extracted === "number") return extracted;
  }
  return undefined;
}

function applyEnum<T>(
  value: unknown,
  map: Record<string, T>,
  setter: (v: T) => void,
): void {
  if (typeof value === "string" && value in map) {
    setter(map[value]!);
  }
}

type StyleObj = Record<string, unknown>;

// Margin prop → Edge mapping
const MARGIN_EDGES: [string, Edge][] = [
  ["margin", Edge.All],
  ["marginHorizontal", Edge.Horizontal],
  ["marginVertical", Edge.Vertical],
  ["marginTop", Edge.Top],
  ["marginBottom", Edge.Bottom],
  ["marginLeft", Edge.Left],
  ["marginRight", Edge.Right],
  ["marginStart", Edge.Start],
  ["marginEnd", Edge.End],
  ["marginBlock", Edge.Vertical],
  ["marginBlockStart", Edge.Top],
  ["marginBlockEnd", Edge.Bottom],
  ["marginInline", Edge.Horizontal],
  ["marginInlineStart", Edge.Start],
  ["marginInlineEnd", Edge.End],
];

// Padding prop → Edge mapping
const PADDING_EDGES: [string, Edge][] = [
  ["padding", Edge.All],
  ["paddingHorizontal", Edge.Horizontal],
  ["paddingVertical", Edge.Vertical],
  ["paddingTop", Edge.Top],
  ["paddingBottom", Edge.Bottom],
  ["paddingLeft", Edge.Left],
  ["paddingRight", Edge.Right],
  ["paddingStart", Edge.Start],
  ["paddingEnd", Edge.End],
  ["paddingBlock", Edge.Vertical],
  ["paddingBlockStart", Edge.Top],
  ["paddingBlockEnd", Edge.Bottom],
  ["paddingInline", Edge.Horizontal],
  ["paddingInlineStart", Edge.Start],
  ["paddingInlineEnd", Edge.End],
];

// Border width prop → Edge mapping
const BORDER_EDGES: [string, Edge][] = [
  ["borderWidth", Edge.All],
  ["borderTopWidth", Edge.Top],
  ["borderBottomWidth", Edge.Bottom],
  ["borderLeftWidth", Edge.Left],
  ["borderRightWidth", Edge.Right],
  ["borderStartWidth", Edge.Start],
  ["borderEndWidth", Edge.End],
];

// Position edge props
const POSITION_EDGES: [string, Edge][] = [
  ["top", Edge.Top],
  ["bottom", Edge.Bottom],
  ["left", Edge.Left],
  ["right", Edge.Right],
  ["start", Edge.Start],
  ["end", Edge.End],
];

// Inset props
const INSET_EDGES: [string, Edge[]][] = [
  ["inset", [Edge.Top, Edge.Bottom, Edge.Left, Edge.Right]],
  ["insetBlock", [Edge.Top, Edge.Bottom]],
  ["insetBlockStart", [Edge.Top]],
  ["insetBlockEnd", [Edge.Bottom]],
  ["insetInline", [Edge.Left, Edge.Right]],
  ["insetInlineStart", [Edge.Start]],
  ["insetInlineEnd", [Edge.End]],
];

function applyDimension(
  node: YogaNode,
  value: DimensionValue,
  setter: (v: number | "auto" | `${number}%`) => void,
): void {
  const arg = toDimensionArg(value);
  if (isDefined(arg)) setter(arg);
}

function applyDimensionNoAuto(
  node: YogaNode,
  value: DimensionValue,
  setter: (v: number | `${number}%`) => void,
): void {
  const arg = toDimensionArg(value);
  if (isDefined(arg) && arg !== "auto") setter(arg);
}

function applyNumber(
  value: DimensionValue,
  setter: (v: number) => void,
): void {
  const arg = toNumberArg(value);
  if (isDefined(arg)) setter(arg);
}

export function applyStyles(
  node: YogaNode,
  style: StyleObj | undefined,
): void {
  if (!style) return;

  // Enum props
  applyEnum(style.flexDirection, FLEX_DIRECTION, (v) =>
    node.setFlexDirection(v),
  );
  applyEnum(style.justifyContent, JUSTIFY, (v) => node.setJustifyContent(v));
  applyEnum(style.alignItems, ALIGN, (v) => node.setAlignItems(v));
  applyEnum(style.alignContent, ALIGN, (v) => node.setAlignContent(v));
  applyEnum(style.alignSelf, ALIGN, (v) => node.setAlignSelf(v));
  applyEnum(style.flexWrap, WRAP_MAP, (v) => node.setFlexWrap(v));
  applyEnum(style.overflow, OVERFLOW_MAP, (v) => node.setOverflow(v));
  applyEnum(style.display, DISPLAY, (v) => node.setDisplay(v));
  applyEnum(style.position, POSITION, (v) => node.setPositionType(v));
  applyEnum(style.boxSizing, BOX_SIZING, (v) => node.setBoxSizing(v));

  // Flex props
  applyNumber(style.flex as DimensionValue, (v) => node.setFlex(v));
  applyNumber(style.flexGrow as DimensionValue, (v) => node.setFlexGrow(v));
  applyNumber(style.flexShrink as DimensionValue, (v) =>
    node.setFlexShrink(v),
  );
  applyDimension(node, style.flexBasis as DimensionValue, (v) =>
    node.setFlexBasis(v),
  );
  applyNumber(style.aspectRatio as DimensionValue, (v) =>
    node.setAspectRatio(v),
  );

  // Dimensions
  applyDimension(node, style.width as DimensionValue, (v) => node.setWidth(v));
  applyDimension(node, style.height as DimensionValue, (v) =>
    node.setHeight(v),
  );
  applyDimensionNoAuto(node, style.minWidth as DimensionValue, (v) =>
    node.setMinWidth(v),
  );
  applyDimensionNoAuto(node, style.maxWidth as DimensionValue, (v) =>
    node.setMaxWidth(v),
  );
  applyDimensionNoAuto(node, style.minHeight as DimensionValue, (v) =>
    node.setMinHeight(v),
  );
  applyDimensionNoAuto(node, style.maxHeight as DimensionValue, (v) =>
    node.setMaxHeight(v),
  );

  // Margin edges
  for (const [prop, edge] of MARGIN_EDGES) {
    const val = toDimensionArg(style[prop] as DimensionValue);
    if (isDefined(val)) node.setMargin(edge, val);
  }

  // Padding edges (no "auto" support)
  for (const [prop, edge] of PADDING_EDGES) {
    const val = toDimensionArg(style[prop] as DimensionValue);
    if (isDefined(val) && val !== "auto") node.setPadding(edge, val);
  }

  // Border width edges
  for (const [prop, edge] of BORDER_EDGES) {
    const val = toNumberArg(style[prop] as DimensionValue);
    if (isDefined(val)) node.setBorder(edge, val);
  }

  // Position edges (no "auto" support via toDimensionArg)
  for (const [prop, edge] of POSITION_EDGES) {
    const val = toDimensionArg(style[prop] as DimensionValue);
    if (isDefined(val) && val !== "auto") node.setPosition(edge, val);
  }

  // Inset props (no "auto" support)
  for (const [prop, edges] of INSET_EDGES) {
    const val = toDimensionArg(style[prop] as DimensionValue);
    if (isDefined(val) && val !== "auto") {
      for (const edge of edges) {
        node.setPosition(edge, val);
      }
    }
  }

  // Gap
  applyNumber(style.gap as DimensionValue, (v) => node.setGap(Gutter.All, v));
  applyNumber(style.rowGap as DimensionValue, (v) =>
    node.setGap(Gutter.Row, v),
  );
  applyNumber(style.columnGap as DimensionValue, (v) =>
    node.setGap(Gutter.Column, v),
  );
}
