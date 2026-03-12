import { useMemo, useCallback } from "react";
import type { SlashCommandDefinition } from "@openslaq/shared";

interface UseSlashCommandAutocompleteOptions {
  text: string;
  commands: SlashCommandDefinition[];
}

interface UseSlashCommandAutocompleteResult {
  suggestions: SlashCommandDefinition[];
  query: string;
  isActive: boolean;
  insertCommand: (item: SlashCommandDefinition) => { text: string; cursorPosition: number };
}

/**
 * Detects `/` at the start of input and provides filtered slash command suggestions.
 * Autocomplete is active only when `/` is at position 0 and no space has been typed yet.
 */
export function useSlashCommandAutocomplete({
  text,
  commands,
}: UseSlashCommandAutocompleteOptions): UseSlashCommandAutocompleteResult {
  const { query, isActive } = useMemo(() => {
    // Only trigger when `/` is the first character
    if (!text.startsWith("/")) return { query: "", isActive: false };

    const afterSlash = text.slice(1);

    // Once a space is typed, the command is "locked in" — close autocomplete
    if (afterSlash.includes(" ")) return { query: "", isActive: false };

    return { query: afterSlash, isActive: true };
  }, [text]);

  const suggestions = useMemo(() => {
    if (!isActive) return [];

    const q = query.toLowerCase();
    return commands
      .filter((cmd) => cmd.name.toLowerCase().startsWith(q))
      .slice(0, 10);
  }, [isActive, query, commands]);

  const insertCommand = useCallback(
    (item: SlashCommandDefinition) => {
      const newText = `/${item.name} `;
      return { text: newText, cursorPosition: newText.length };
    },
    [],
  );

  return {
    suggestions,
    query,
    isActive,
    insertCommand,
  };
}
