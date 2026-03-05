import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { MentionSuggestionList, type MentionSuggestionItem, type MentionSuggestionListRef } from "./MentionSuggestion";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

export type { MentionSuggestionItem };

const GROUP_MENTIONS: MentionSuggestionItem[] = [
  { id: "here", displayName: "@here — notify online members", isGroup: true },
  { id: "channel", displayName: "@channel — notify all members", isGroup: true },
];

export function createMentionSuggestion(
  getMembers: () => MentionSuggestionItem[],
  isActiveRef?: { current: boolean },
): Omit<SuggestionOptions<MentionSuggestionItem>, "editor"> {
  return {
    items: ({ query }) => {
      const q = query.toLowerCase();
      const members = getMembers();

      // Filter group mentions
      const groups = GROUP_MENTIONS.filter((g) =>
        g.id.toLowerCase().startsWith(q) || g.displayName.toLowerCase().includes(q),
      );

      // Filter user mentions
      const users = members.filter((m) =>
        m.displayName.toLowerCase().includes(q),
      );

      return [...groups, ...users].slice(0, 10);
    },

    render: () => {
      let container: HTMLDivElement | null = null;
      let root: Root | null = null;
      let ref: MentionSuggestionListRef | null = null;

      return {
        onStart: (props: SuggestionProps<MentionSuggestionItem>) => {
          if (isActiveRef) isActiveRef.current = true;
          container = document.createElement("div");
          container.style.position = "absolute";
          container.style.zIndex = "50";

          // Position above the cursor
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
              ref: (r: MentionSuggestionListRef | null) => { ref = r; },
            }),
          );
        },

        onUpdate: (props: SuggestionProps<MentionSuggestionItem>) => {
          if (!container || !root) return;

          // Reposition
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
              ref: (r: MentionSuggestionListRef | null) => { ref = r; },
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
          if (isActiveRef) isActiveRef.current = false;
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
