import { MeasureMode } from "yoga-layout/load";
import type { MeasureFunction } from "yoga-layout/load";
import type { RNTreeNode } from "./types.js";

export interface TextMeasureOptions {
  charsPerLine: number;
  lineHeight: number;
}

const CHAR_WIDTH = 8;

export function createTextMeasureFunc(
  text: string,
  opts: TextMeasureOptions,
): MeasureFunction {
  return (width, widthMode, _height, _heightMode) => {
    const naturalWidth = text.length * CHAR_WIDTH;

    let measuredWidth: number;
    if (widthMode === MeasureMode.Exactly) {
      measuredWidth = width;
    } else if (widthMode === MeasureMode.AtMost) {
      measuredWidth = Math.min(naturalWidth, width);
    } else {
      measuredWidth = naturalWidth;
    }

    const effectiveWidth = Math.max(measuredWidth, 1);
    const lines = Math.max(1, Math.ceil(naturalWidth / effectiveWidth));
    const measuredHeight = lines * opts.lineHeight;

    return { width: measuredWidth, height: measuredHeight };
  };
}

export function extractTextContent(node: RNTreeNode): string {
  let text = "";
  function walk(n: RNTreeNode | string): void {
    if (typeof n === "string") {
      text += n;
      return;
    }
    if (n.children) {
      for (const child of n.children) {
        walk(child);
      }
    }
  }
  walk(node);
  return text;
}
