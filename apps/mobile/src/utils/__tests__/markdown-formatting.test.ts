import { applyMarkdownFormat, type FormatType } from "../markdown-formatting";

describe("applyMarkdownFormat", () => {
  describe("inline formats", () => {
    const inlineCases: [FormatType, string][] = [
      ["bold", "**"],
      ["italic", "*"],
      ["strikethrough", "~~"],
      ["code", "`"],
    ];

    it.each(inlineCases)(
      "%s: inserts markers at cursor when no selection",
      (format, marker) => {
        const result = applyMarkdownFormat("hello world", { start: 5, end: 5 }, format);
        expect(result.text).toBe(`hello${marker}${marker} world`);
        expect(result.selection.start).toBe(5 + marker.length);
        expect(result.selection.end).toBe(5 + marker.length);
      },
    );

    it.each(inlineCases)(
      "%s: wraps selected text",
      (format, marker) => {
        const result = applyMarkdownFormat("hello world", { start: 0, end: 5 }, format);
        expect(result.text).toBe(`${marker}hello${marker} world`);
        const expectedEnd = 5 + marker.length * 2;
        expect(result.selection.start).toBe(expectedEnd);
        expect(result.selection.end).toBe(expectedEnd);
      },
    );

    it("bold on empty text with cursor at 0", () => {
      const result = applyMarkdownFormat("", { start: 0, end: 0 }, "bold");
      expect(result.text).toBe("****");
      expect(result.selection).toEqual({ start: 2, end: 2 });
    });

    it("bold at end of text", () => {
      const result = applyMarkdownFormat("hi", { start: 2, end: 2 }, "bold");
      expect(result.text).toBe("hi****");
      expect(result.selection).toEqual({ start: 4, end: 4 });
    });
  });

  describe("codeBlock", () => {
    it("wraps current line when no selection", () => {
      const result = applyMarkdownFormat("some code", { start: 4, end: 4 }, "codeBlock");
      expect(result.text).toBe("```\nsome code\n```");
    });

    it("wraps selected lines in multiline text", () => {
      const result = applyMarkdownFormat("line1\nline2\nline3", { start: 6, end: 11 }, "codeBlock");
      expect(result.text).toBe("line1\n```\nline2\n```\nline3");
    });
  });

  describe("blockquote", () => {
    it("prefixes current line with >", () => {
      const result = applyMarkdownFormat("hello", { start: 0, end: 0 }, "blockquote");
      expect(result.text).toBe("> hello");
    });

    it("prefixes multiple lines", () => {
      const result = applyMarkdownFormat("a\nb\nc", { start: 0, end: 5 }, "blockquote");
      expect(result.text).toBe("> a\n> b\n> c");
    });
  });

  describe("bulletList", () => {
    it("prefixes current line with -", () => {
      const result = applyMarkdownFormat("item", { start: 0, end: 0 }, "bulletList");
      expect(result.text).toBe("- item");
    });

    it("prefixes multiple lines", () => {
      const result = applyMarkdownFormat("a\nb\nc", { start: 0, end: 5 }, "bulletList");
      expect(result.text).toBe("- a\n- b\n- c");
    });
  });

  describe("orderedList", () => {
    it("numbers current line", () => {
      const result = applyMarkdownFormat("item", { start: 0, end: 0 }, "orderedList");
      expect(result.text).toBe("1. item");
    });

    it("numbers multiple lines", () => {
      const result = applyMarkdownFormat("a\nb\nc", { start: 0, end: 5 }, "orderedList");
      expect(result.text).toBe("1. a\n2. b\n3. c");
    });
  });

  describe("edge cases", () => {
    it("handles empty text for block format", () => {
      const result = applyMarkdownFormat("", { start: 0, end: 0 }, "blockquote");
      expect(result.text).toBe("> ");
    });

    it("handles cursor in middle of multiline for blockquote", () => {
      const result = applyMarkdownFormat("first\nsecond\nthird", { start: 8, end: 8 }, "blockquote");
      expect(result.text).toBe("first\n> second\nthird");
    });

    it("blockquote does not format next line when selection ends at line boundary", () => {
      // BUG: Selection "first\n" (end=6, cursor at start of "second") causes
      // getLineBounds to search for next \n from position 6, finding position 12,
      // so "second" is incorrectly included in the blockquote
      const text = "first\nsecond\nthird";
      // Selection covers "first\n" — positions 0 through 5, cursor at 6
      const result = applyMarkdownFormat(text, { start: 0, end: 6 }, "blockquote");
      // Only "first" should be blockquoted, not "second"
      expect(result.text).toBe("> first\nsecond\nthird");
    });

    it("bulletList does not format next line when selection ends at line boundary", () => {
      const text = "aaa\nbbb\nccc";
      // Selection covers "aaa\n" — end=4 is at start of "bbb"
      const result = applyMarkdownFormat(text, { start: 0, end: 4 }, "bulletList");
      expect(result.text).toBe("- aaa\nbbb\nccc");
    });
  });
});
