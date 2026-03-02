import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MentionSuggestionList, type MentionSuggestionItem, type MentionSuggestionListRef } from "./MentionSuggestion";
import { filterMentionItems } from "./mention-helpers";

export type { MentionSuggestionItem };

export function createMentionSuggestion(
  getMembers: () => MentionSuggestionItem[],
): Omit<SuggestionOptions<MentionSuggestionItem>, "editor"> {
  return {
    items: ({ query }) => filterMentionItems(query, getMembers()),

    render: () => {
      let container: HTMLDivElement | null = null;
      let root: Root | null = null;
      let ref: MentionSuggestionListRef | null = null;

      return {
        onStart: (props: SuggestionProps<MentionSuggestionItem>) => {
          container = document.createElement("div");
          container.style.position = "fixed";
          container.style.zIndex = "50";

          const { decorationNode } = props;
          if (decorationNode) {
            const rect = (decorationNode as HTMLElement).getBoundingClientRect();
            container.style.left = `${rect.left}px`;
            container.style.bottom = `${window.innerHeight - rect.top + 4}px`;
          }

          document.body.appendChild(container);
          root = createRoot(container);
          root.render(
            createElement(MentionSuggestionList, {
              items: props.items,
              command: props.command,
              ref: (r: MentionSuggestionListRef | null) => {
                ref = r;
              },
            }),
          );
        },

        onUpdate: (props: SuggestionProps<MentionSuggestionItem>) => {
          if (!container || !root) return;

          const { decorationNode } = props;
          if (decorationNode) {
            const rect = (decorationNode as HTMLElement).getBoundingClientRect();
            container.style.left = `${rect.left}px`;
            container.style.bottom = `${window.innerHeight - rect.top + 4}px`;
          }

          root.render(
            createElement(MentionSuggestionList, {
              items: props.items,
              command: props.command,
              ref: (r: MentionSuggestionListRef | null) => {
                ref = r;
              },
            }),
          );
        },

        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === "Escape") {
            if (container) {
              root?.unmount();
              container.remove();
              container = null;
              root = null;
            }
            return true;
          }
          return ref?.onKeyDown(props) ?? false;
        },

        onExit: () => {
          if (container) {
            root?.unmount();
            container.remove();
            container = null;
            root = null;
          }
        },
      };
    },
  };
}
