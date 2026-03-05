import { describe, expect, it } from "bun:test";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { MentionWithMarkdown } from "./MentionMarkdown";
import { getMarkdown } from "./editor-helpers";

function createEditor() {
  return new Editor({
    extensions: [
      StarterKit,
      MentionWithMarkdown.configure({
        HTMLAttributes: { class: "mention" },
        renderText({ node }) {
          return `<@${node.attrs.id}>`;
        },
      }),
      Markdown,
    ],
  });
}

describe("MentionWithMarkdown", () => {
  it("serializes a mention node as <@id>", () => {
    const editor = createEditor();
    editor.commands.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "hello " },
            { type: "mention", attrs: { id: "here", label: null } },
          ],
        },
      ],
    });

    const md = getMarkdown(editor.storage);
    expect(md).toBe("hello <@here>");
    editor.destroy();
  });

  it("serializes a user mention as <@userId>", () => {
    const editor = createEditor();
    editor.commands.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "mention", attrs: { id: "U123ABC", label: null } },
            { type: "text", text: " check this out" },
          ],
        },
      ],
    });

    const md = getMarkdown(editor.storage);
    expect(md).toBe("<@U123ABC> check this out");
    editor.destroy();
  });

  it("does not produce HTML span tags", () => {
    const editor = createEditor();
    editor.commands.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "mention", attrs: { id: "here", label: null } },
          ],
        },
      ],
    });

    const md = getMarkdown(editor.storage);
    expect(md).not.toContain("<span");
    expect(md).not.toContain("data-type");
    editor.destroy();
  });
});
