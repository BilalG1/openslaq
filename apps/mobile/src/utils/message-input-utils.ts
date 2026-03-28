import type { SlashCommandDefinition } from "@openslaq/shared";

export interface MentionCandidate {
  id: string;
  displayName: string;
  isGroup?: boolean;
}

const MAX_SUGGESTIONS = 10;

/**
 * Filters mention candidates by display name (case-insensitive substring match).
 * Returns at most 10 results.
 */
export function filterMentionSuggestions(
  members: MentionCandidate[],
  query: string | null,
): MentionCandidate[] {
  if (query === null) return [];
  const lower = query.toLowerCase();
  return members
    .filter((m) => m.displayName.toLowerCase().includes(lower))
    .slice(0, MAX_SUGGESTIONS);
}

/**
 * Filters slash commands by name prefix (case-insensitive).
 * Returns at most 10 results.
 */
export function filterSlashSuggestions(
  commands: SlashCommandDefinition[],
  query: string | null,
): SlashCommandDefinition[] {
  if (query === null) return [];
  const lower = query.toLowerCase();
  return commands
    .filter((c) => c.name.toLowerCase().startsWith(lower))
    .slice(0, MAX_SUGGESTIONS);
}

/**
 * Parses a slash command string into its command name and arguments.
 * Returns null if the string doesn't start with "/".
 */
export function parseSlashCommand(text: string): { command: string; args: string } | null {
  if (!text.startsWith("/")) return null;
  const spaceIndex = text.indexOf(" ");
  const command = spaceIndex > 0 ? text.slice(1, spaceIndex) : text.slice(1);
  const args = spaceIndex > 0 ? text.slice(spaceIndex + 1).trim() : "";
  return { command, args };
}
