import Mention from "@tiptap/extension-mention";

export const MentionWithMarkdown = Mention.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize(state: any, node: any) {
          state.write(`<@${node.attrs.id}>`);
        },
        parse: {},
      },
    };
  },
});
