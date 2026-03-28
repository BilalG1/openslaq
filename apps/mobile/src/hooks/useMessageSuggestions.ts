import { useCallback, useState } from "react";
import type { SlashCommandDefinition } from "@openslaq/shared";
import { filterMentionSuggestions, filterSlashSuggestions, type MentionCandidate } from "@/utils/message-input-utils";

interface UseMessageSuggestionsOptions {
  members: MentionCandidate[];
  slashCommands: SlashCommandDefinition[];
}

export function useMessageSuggestions({ members, slashCommands }: UseMessageSuggestionsOptions) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);

  const mentionSuggestions = filterMentionSuggestions(members, mentionQuery);
  const slashSuggestions = filterSlashSuggestions(slashCommands, slashQuery);

  const clearSuggestions = useCallback(() => {
    setMentionQuery(null);
    setSlashQuery(null);
  }, []);

  return {
    mentionQuery,
    setMentionQuery,
    slashQuery,
    setSlashQuery,
    mentionSuggestions,
    slashSuggestions,
    clearSuggestions,
  };
}
