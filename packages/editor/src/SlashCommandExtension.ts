import { Extension } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionOptions } from "@tiptap/suggestion";
import type { SlashCommandItem } from "./SlashCommandSuggestion";

export const SlashCommand = Extension.create<{
  suggestion: Omit<SuggestionOptions<SlashCommandItem>, "editor">;
}>({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        // Only trigger at the start of the content (position 0 + 1 for doc offset)
        allowedPrefixes: null,
        startOfLine: true,
        items: () => [],
        command: ({ editor, range, props }) => {
          // Replace the /query with /commandName and a space
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(`/${(props as SlashCommandItem).name} `)
            .run();
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
