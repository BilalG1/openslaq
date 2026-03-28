import Mention from "@tiptap/extension-mention";

export const MentionWithMarkdown = Mention.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize(state: { write: (text: string) => void }, node: { attrs: { id: string } }) {
          state.write(`<@${node.attrs.id}>`);
        },
        parse: {},
      },
    };
  },
});
