export type FormatType =
  | "bold"
  | "italic"
  | "strikethrough"
  | "code"
  | "codeBlock"
  | "blockquote"
  | "bulletList"
  | "orderedList";

export type Selection = { start: number; end: number };
export type FormatResult = { text: string; selection: Selection };

const INLINE_MARKERS: Partial<Record<FormatType, string>> = {
  bold: "**",
  italic: "*",
  strikethrough: "~~",
  code: "`",
};

function getLineBounds(text: string, start: number, end: number) {
  let lineStart = text.lastIndexOf("\n", start - 1) + 1;
  let lineEnd = text.indexOf("\n", end);
  if (lineEnd === -1) lineEnd = text.length;
  return { lineStart, lineEnd };
}

export function applyMarkdownFormat(
  text: string,
  selection: Selection,
  format: FormatType,
): FormatResult {
  const { start, end } = selection;
  const marker = INLINE_MARKERS[format];

  // Inline formats
  if (marker) {
    const selected = text.slice(start, end);
    const before = text.slice(0, start);
    const after = text.slice(end);

    if (start === end) {
      // No selection — insert markers, cursor between
      const newText = before + marker + marker + after;
      return {
        text: newText,
        selection: { start: start + marker.length, end: start + marker.length },
      };
    }

    // Wrap selection
    const newText = before + marker + selected + marker + after;
    const newEnd = end + marker.length * 2;
    return { text: newText, selection: { start: newEnd, end: newEnd } };
  }

  // Block formats
  const { lineStart, lineEnd } = getLineBounds(text, start, end);
  const lineContent = text.slice(lineStart, lineEnd);
  const lines = lineContent.split("\n");
  const before = text.slice(0, lineStart);
  const after = text.slice(lineEnd);

  let formatted: string;

  switch (format) {
    case "codeBlock": {
      formatted = "```\n" + lineContent + "\n```";
      const newEnd = lineStart + formatted.length;
      return {
        text: before + formatted + after,
        selection: { start: newEnd, end: newEnd },
      };
    }
    case "blockquote":
      formatted = lines.map((l) => `> ${l}`).join("\n");
      break;
    case "bulletList":
      formatted = lines.map((l) => `- ${l}`).join("\n");
      break;
    case "orderedList":
      formatted = lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
      break;
    default:
      return { text, selection };
  }

  const newText = before + formatted + after;
  const newEnd = lineStart + formatted.length;
  return { text: newText, selection: { start: newEnd, end: newEnd } };
}
