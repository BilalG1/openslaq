import fc from "fast-check";
import {
  applyMarkdownFormat,
  type FormatType,
  type Selection,
} from "../markdown-formatting";

const INLINE_FORMATS: FormatType[] = ["bold", "italic", "strikethrough", "code"];
const BLOCK_FORMATS: FormatType[] = [
  "blockquote",
  "bulletList",
  "orderedList",
  "codeBlock",
];
const ALL_FORMATS: FormatType[] = [...INLINE_FORMATS, ...BLOCK_FORMATS];

const INLINE_MARKERS: Record<string, string> = {
  bold: "**",
  italic: "*",
  strikethrough: "~~",
  code: "`",
};

const textArb = fc.string({ minLength: 0, maxLength: 200 });
const formatArb = fc.constantFrom(...ALL_FORMATS);
const inlineFormatArb = fc.constantFrom(...INLINE_FORMATS);
const blockFormatArb = fc.constantFrom(
  ...BLOCK_FORMATS.filter((f) => f !== "codeBlock"),
);

function selectionArb(textLen: number) {
  if (textLen === 0) return fc.constant({ start: 0, end: 0 });
  return fc
    .tuple(fc.nat({ max: textLen }), fc.nat({ max: textLen }))
    .map(([a, b]) => ({ start: Math.min(a, b), end: Math.max(a, b) }));
}

describe("applyMarkdownFormat property tests", () => {
  test("never throws on arbitrary input", () => {
    fc.assert(
      fc.property(textArb, formatArb, (text, format) => {
        const sel: Selection = { start: 0, end: Math.min(text.length, 5) };
        expect(() => applyMarkdownFormat(text, sel, format)).not.toThrow();
      }),
      { numRuns: 300 },
    );
  });

  test("cursor position is always within bounds", () => {
    fc.assert(
      fc.property(textArb, formatArb, (text, format) => {
        const sel: Selection = {
          start: Math.min(text.length, 3),
          end: Math.min(text.length, 7),
        };
        const result = applyMarkdownFormat(text, sel, format);
        expect(result.selection.start).toBeGreaterThanOrEqual(0);
        expect(result.selection.start).toBeLessThanOrEqual(result.text.length);
        expect(result.selection.end).toBeGreaterThanOrEqual(0);
        expect(result.selection.end).toBeLessThanOrEqual(result.text.length);
      }),
      { numRuns: 300 },
    );
  });

  test("cursor in bounds with random selections", () => {
    fc.assert(
      fc.property(
        textArb.chain((text) =>
          selectionArb(text.length).map((sel) => ({ text, sel })),
        ),
        formatArb,
        ({ text, sel }, format) => {
          const result = applyMarkdownFormat(text, sel, format);
          expect(result.selection.start).toBeGreaterThanOrEqual(0);
          expect(result.selection.start).toBeLessThanOrEqual(
            result.text.length,
          );
          expect(result.selection.end).toBeGreaterThanOrEqual(0);
          expect(result.selection.end).toBeLessThanOrEqual(result.text.length);
        },
      ),
      { numRuns: 500 },
    );
  });

  test("inline format with empty selection inserts paired markers", () => {
    fc.assert(
      fc.property(textArb, inlineFormatArb, (text, format) => {
        const pos = Math.min(text.length, 5);
        const result = applyMarkdownFormat(
          text,
          { start: pos, end: pos },
          format,
        );
        const marker = INLINE_MARKERS[format]!;
        expect(result.text.length).toBe(text.length + marker.length * 2);
        expect(result.selection.start).toBe(pos + marker.length);
        expect(result.selection.end).toBe(pos + marker.length);
      }),
      { numRuns: 200 },
    );
  });

  test("inline format with selection wraps text in markers", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 100 }),
        inlineFormatArb,
        (text, format) => {
          const start = 1;
          const end = Math.min(4, text.length);
          if (start >= end) return;
          const result = applyMarkdownFormat(text, { start, end }, format);
          const marker = INLINE_MARKERS[format]!;
          expect(result.text.length).toBe(text.length + marker.length * 2);
          // Selected text should appear flanked by markers
          const selected = text.slice(start, end);
          expect(result.text).toContain(marker + selected + marker);
        },
      ),
      { numRuns: 200 },
    );
  });

  test("code block adds exactly 2 fence lines", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes("\n")),
        (text) => {
          const result = applyMarkdownFormat(
            text,
            { start: 0, end: 0 },
            "codeBlock",
          );
          expect(result.text).toBe("```\n" + text + "\n```");
        },
      ),
      { numRuns: 100 },
    );
  });

  test("ordered list numbers are sequential", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes("\n")), {
          minLength: 1,
          maxLength: 10,
        }),
        (lines) => {
          const text = lines.join("\n");
          const result = applyMarkdownFormat(
            text,
            { start: 0, end: text.length },
            "orderedList",
          );
          const resultLines = result.text.split("\n");
          resultLines.forEach((line, i) => {
            expect(line).toMatch(new RegExp(`^${i + 1}\\. `));
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  test("block formats (non-codeBlock) preserve line count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 0, maxLength: 20 }).filter((s) => !s.includes("\n")), {
          minLength: 1,
          maxLength: 10,
        }),
        blockFormatArb,
        (lines, format) => {
          const text = lines.join("\n");
          const result = applyMarkdownFormat(
            text,
            { start: 0, end: text.length },
            format,
          );
          const inputLineCount = text.split("\n").length;
          const outputLineCount = result.text.split("\n").length;
          expect(outputLineCount).toBe(inputLineCount);
        },
      ),
      { numRuns: 200 },
    );
  });
});
