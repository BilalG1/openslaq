import { describe, it, expect } from "bun:test";
import { MeasureMode } from "yoga-layout/load";
import { createTextMeasureFunc, extractTextContent } from "../text-measure";
import type { RNTreeNode } from "../types";

const defaultOpts = { charsPerLine: 45, lineHeight: 20 };

describe("createTextMeasureFunc", () => {
  it("returns natural width for undefined width mode", () => {
    const measure = createTextMeasureFunc("Hello", defaultOpts);
    const result = measure(0, MeasureMode.Undefined, 0, MeasureMode.Undefined);
    expect(result.width).toBe(40); // 5 chars * 8px
    expect(result.height).toBe(20); // 1 line
  });

  it("constrains to max width in AtMost mode", () => {
    const measure = createTextMeasureFunc("Hello World 123456", defaultOpts);
    const result = measure(50, MeasureMode.AtMost, 0, MeasureMode.Undefined);
    expect(result.width).toBe(50);
    // 18 chars * 8 = 144px natural, 50px constraint -> ceil(144/50)=3 lines
    expect(result.height).toBe(60);
  });

  it("uses exact width in Exactly mode", () => {
    const measure = createTextMeasureFunc("Hi", defaultOpts);
    const result = measure(200, MeasureMode.Exactly, 0, MeasureMode.Undefined);
    expect(result.width).toBe(200);
    expect(result.height).toBe(20); // text fits in one line
  });

  it("handles empty text", () => {
    const measure = createTextMeasureFunc("", defaultOpts);
    const result = measure(0, MeasureMode.Undefined, 0, MeasureMode.Undefined);
    expect(result.width).toBe(0);
    expect(result.height).toBe(20); // minimum 1 line
  });
});

describe("extractTextContent", () => {
  it("extracts text from string children", () => {
    const node: RNTreeNode = {
      type: "Text",
      props: {},
      children: ["Hello ", "World"],
    };
    expect(extractTextContent(node)).toBe("Hello World");
  });

  it("extracts text from nested Text nodes", () => {
    const node: RNTreeNode = {
      type: "Text",
      props: {},
      children: [
        "Hello ",
        {
          type: "Text",
          props: { style: { fontWeight: "bold" } },
          children: ["World"],
        },
      ],
    };
    expect(extractTextContent(node)).toBe("Hello World");
  });

  it("returns empty string for null children", () => {
    const node: RNTreeNode = { type: "Text", props: {}, children: null };
    expect(extractTextContent(node)).toBe("");
  });
});
