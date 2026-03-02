import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  SlashCommandSuggestionList,
  type SlashCommandItem,
  type SlashCommandSuggestionListRef,
} from "./SlashCommandSuggestion";

export type { SlashCommandItem };

export function createSlashCommandSuggestion(
  getCommands: () => SlashCommandItem[],
  isActiveRef?: { current: boolean },
): Omit<SuggestionOptions<SlashCommandItem>, "editor"> {
  return {
    items: ({ query }) => {
      const commands = getCommands();
      if (!query) return commands;
      return commands.filter((cmd) =>
        cmd.name.toLowerCase().startsWith(query.toLowerCase()),
      );
    },

    render: () => {
      let container: HTMLDivElement | null = null;
      let root: Root | null = null;
      let ref: SlashCommandSuggestionListRef | null = null;

      return {
        onStart: (props: SuggestionProps<SlashCommandItem>) => {
          if (isActiveRef) isActiveRef.current = true;
          container = document.createElement("div");
          container.style.position = "absolute";
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
            createElement(SlashCommandSuggestionList, {
              items: props.items,
              command: props.command,
              ref: (r: SlashCommandSuggestionListRef | null) => {
                ref = r;
              },
            }),
          );
        },

        onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
          if (!container || !root) return;

          const { decorationNode } = props;
          if (decorationNode) {
            const rect = (decorationNode as HTMLElement).getBoundingClientRect();
            container.style.left = `${rect.left}px`;
            container.style.bottom = `${window.innerHeight - rect.top + 4}px`;
          }

          root.render(
            createElement(SlashCommandSuggestionList, {
              items: props.items,
              command: props.command,
              ref: (r: SlashCommandSuggestionListRef | null) => {
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
