import { useState, useEffect, useCallback, useRef, type ComponentType } from "react";
import { ComposeHeader, type ComposeRecipient } from "./ComposeHeader";
import { MessageList as DefaultMessageList } from "../message/MessageList";
import { MessageInput as DefaultMessageInput } from "../message/MessageInput";
import { TypingIndicator as DefaultTypingIndicator } from "../message/TypingIndicator";
import { useTypingEmitter as defaultUseTypingEmitter } from "../../hooks/chat/useTypingEmitter";
import { useTypingTracking } from "../../hooks/chat/useTypingTracking";
import { useChatStore } from "../../state/chat-store";
import { findOrCreateDmForCompose as defaultFindOrCreateDmForCompose, findOrCreateGroupDmForCompose as defaultFindOrCreateGroupDmForCompose } from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useWorkspaceMembersApi } from "../../hooks/api/useWorkspaceMembersApi";
import { useAsyncEffect as defaultUseAsyncEffect } from "../../hooks/useAsyncEffect";
import type { Channel } from "@openslaq/shared";
import type { PresenceEntry } from "../../state/chat-store";

interface Member {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

interface ComposeViewProps {
  workspaceSlug: string;
  currentUserId: string;
  channels: Channel[];
  presence: Record<string, PresenceEntry>;
  workspaceMembers: Array<{ id: string; displayName: string }>;
  onSelectChannel: (channelId: string) => void;
  onOpenThread: (messageId: string) => void;
  onOpenProfile: (userId: string) => void;
  /** Component/hook overrides for testing */
  slots?: {
    MessageList?: ComponentType<{ channelId: string; onOpenThread: (id: string) => void; onOpenProfile: (id: string) => void; ephemeralMessages: unknown[] }>;
    MessageInput?: ComponentType<{ channelId: string; channelName: string; onTyping: () => void }>;
    TypingIndicator?: ComponentType<{ typingUsers: unknown[] }>;
    useAsyncEffect?: typeof defaultUseAsyncEffect;
    useTypingEmitter?: typeof defaultUseTypingEmitter;
    findOrCreateDmForCompose?: typeof defaultFindOrCreateDmForCompose;
    findOrCreateGroupDmForCompose?: typeof defaultFindOrCreateGroupDmForCompose;
  };
}

export function ComposeView({
  workspaceSlug,
  currentUserId,
  channels,
  presence,
  workspaceMembers,
  onSelectChannel,
  onOpenThread,
  onOpenProfile,
  slots,
}: ComposeViewProps) {
  const MessageList = slots?.MessageList ?? DefaultMessageList;
  const MessageInput = slots?.MessageInput ?? DefaultMessageInput;
  const TypingIndicator = slots?.TypingIndicator ?? DefaultTypingIndicator;
  const useAsyncEffect = slots?.useAsyncEffect ?? defaultUseAsyncEffect;
  const useTypingEmitter = slots?.useTypingEmitter ?? defaultUseTypingEmitter;
  const findOrCreateDm = slots?.findOrCreateDmForCompose ?? defaultFindOrCreateDmForCompose;
  const findOrCreateGroupDm = slots?.findOrCreateGroupDmForCompose ?? defaultFindOrCreateGroupDmForCompose;

  const [selectedUsers, setSelectedUsers] = useState<ComposeRecipient[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const { state, dispatch } = useChatStore();
  const auth = useAuthProvider();
  const { listMembers } = useWorkspaceMembersApi();
  const resolvingRef = useRef(false);

  const previewChannelId = state.composePreviewChannelId;

  // Fetch full member list for search
  useAsyncEffect(
    async (signal) => {
      if (!workspaceSlug) return;
      try {
        const data = await listMembers(workspaceSlug);
        if (!signal.cancelled) {
          setMembers(data.map((m) => ({ id: m.id, displayName: m.displayName, email: m.email, avatarUrl: m.avatarUrl })));
        }
      } catch {
        // ignore
      }
    },
    [workspaceSlug, listMembers],
  );

  // Resolve DM/group DM when selection changes
  useEffect(() => {
    if (resolvingRef.current) return;

    if (selectedUsers.length === 0) {
      dispatch({ type: "compose/setPreviewChannel", channelId: null });
      return;
    }

    if (selectedUsers.length === 1) {
      const targetUserId = selectedUsers[0]!.id;
      const existingDm = state.dms.find((dm) => dm.otherUser.id === targetUserId);
      if (existingDm) {
        dispatch({ type: "compose/setPreviewChannel", channelId: existingDm.channel.id });
        return;
      }
      resolvingRef.current = true;
      const deps = { api, auth, dispatch, getState: () => state };
      findOrCreateDm(deps, { workspaceSlug, targetUserId }).finally(() => {
        resolvingRef.current = false;
      });
    } else {
      const targetIds = new Set(selectedUsers.map((u) => u.id));
      const existingGroupDm = state.groupDms.find((g) => {
        const memberIds = new Set(g.members.map((m) => m.id));
        return targetIds.size === memberIds.size && [...targetIds].every((id) => memberIds.has(id));
      });
      if (existingGroupDm) {
        dispatch({ type: "compose/setPreviewChannel", channelId: existingGroupDm.channel.id });
        return;
      }
      resolvingRef.current = true;
      const deps = { api, auth, dispatch, getState: () => state };
      findOrCreateGroupDm(deps, { workspaceSlug, memberIds: selectedUsers.map((u) => u.id) }).finally(() => {
        resolvingRef.current = false;
      });
    }
  }, [selectedUsers]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddUser = useCallback((user: ComposeRecipient) => {
    setSelectedUsers((prev) => {
      if (prev.some((u) => u.id === user.id)) return prev;
      return [...prev, user];
    });
  }, []);

  const handleRemoveUser = useCallback((userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const { emitTyping } = useTypingEmitter(previewChannelId ?? undefined);
  const typingUsers = useTypingTracking(previewChannelId ?? undefined, currentUserId, workspaceMembers);

  return (
    <div className="flex-1 min-w-0 flex flex-col" data-testid="compose-view">
      <div className="px-4 py-3 border-b border-border-default">
        <h2 className="text-lg font-bold text-primary">New Message</h2>
      </div>

      <ComposeHeader
        selectedUsers={selectedUsers}
        onAddUser={handleAddUser}
        onRemoveUser={handleRemoveUser}
        onSelectChannel={onSelectChannel}
        members={members}
        channels={channels}
        currentUserId={currentUserId}
        presence={presence}
      />

      {selectedUsers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-faint" data-testid="compose-empty-state">
          Search for a channel or person to start a conversation
        </div>
      ) : previewChannelId ? (
        <>
          <MessageList
            channelId={previewChannelId}
            onOpenThread={onOpenThread}
            onOpenProfile={onOpenProfile}
            ephemeralMessages={[]}
          />
          <TypingIndicator typingUsers={typingUsers} />
          <MessageInput
            channelId={previewChannelId}
            channelName={selectedUsers.map((u) => u.displayName).join(", ")}
            isDm
            onTyping={emitTyping}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-faint">
          Loading conversation...
        </div>
      )}
    </div>
  );
}
