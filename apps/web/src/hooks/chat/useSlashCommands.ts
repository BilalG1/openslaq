import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { fetchSlashCommands, executeSlashCommand } from "@openslaq/client-core";
import type { SlashCommandDefinition, EphemeralMessage } from "@openslaq/shared";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";

export function useSlashCommands() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const auth = useAuthProvider();
  const [commands, setCommands] = useState<SlashCommandDefinition[]>([]);
  const [ephemeralMessages, setEphemeralMessages] = useState<Record<string, EphemeralMessage[]>>({});
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!workspaceSlug || fetchedRef.current) return;
    fetchedRef.current = true;

    fetchSlashCommands({ api, auth }, { workspaceSlug })
      .then(setCommands)
      .catch(() => {});

    return () => {
      fetchedRef.current = false;
    };
  }, [workspaceSlug, auth]);

  const execute = useCallback(
    async (channelId: string, command: string, args: string) => {
      if (!workspaceSlug) return;
      try {
        const result = await executeSlashCommand(
          { api, auth },
          { workspaceSlug, channelId, command, args },
        );
        if (result.ephemeralMessages?.length) {
          setEphemeralMessages((prev) => ({
            ...prev,
            [channelId]: [
              ...(prev[channelId] ?? []),
              ...result.ephemeralMessages!,
            ],
          }));
        }
        if (result.error) {
          // Show error as ephemeral message
          setEphemeralMessages((prev) => ({
            ...prev,
            [channelId]: [
              ...(prev[channelId] ?? []),
              {
                id: crypto.randomUUID(),
                channelId: channelId as never,
                text: result.error!,
                senderName: "Slaqbot",
                senderAvatarUrl: null,
                createdAt: new Date().toISOString(),
                ephemeral: true,
              },
            ],
          }));
        }
      } catch {
        // Silently fail
      }
    },
    [workspaceSlug, auth],
  );

  const addEphemeral = useCallback(
    (msg: EphemeralMessage) => {
      setEphemeralMessages((prev) => ({
        ...prev,
        [msg.channelId]: [...(prev[msg.channelId] ?? []), msg],
      }));
    },
    [],
  );

  const getEphemeralMessages = useCallback(
    (channelId: string) => ephemeralMessages[channelId] ?? [],
    [ephemeralMessages],
  );

  return { commands, execute, addEphemeral, getEphemeralMessages };
}
