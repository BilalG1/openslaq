import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ResizeHandle } from "./ResizeHandle";
import { UpdateBanner } from "../update/UpdateBanner";
import { MessageList } from "../message/MessageList";
import { MessageInput, type MessageInputHandle } from "../message/MessageInput";
import { TypingIndicator } from "../message/TypingIndicator";
import { ChannelHeader } from "../channel/ChannelHeader";
import { DmHeader } from "../dm/DmHeader";
import { ThreadPanel } from "../message/ThreadPanel";
import { UserProfileSidebar } from "../profile/UserProfileSidebar";
import { SearchModal } from "../search/SearchModal";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useResizable } from "../../hooks/useResizable";
import { useWorkspaceBootstrap } from "../../hooks/chat/useWorkspaceBootstrap";
import { useUnreadTracking } from "../../hooks/chat/useUnreadTracking";
import { usePresenceTracking } from "../../hooks/chat/usePresenceTracking";
import { useHuddleTracking } from "../../hooks/chat/useHuddleTracking";
import { useHuddleActions } from "../../hooks/chat/useHuddleActions";
import { useDmActions } from "../../hooks/chat/useDmActions";
import { useScrollToMessage } from "../../hooks/chat/useScrollToMessage";
import { useChannelMemberTracking } from "../../hooks/chat/useChannelMemberTracking";
import { useCustomEmojiTracking } from "../../hooks/chat/useCustomEmojiTracking";
import { useBookmarkTracking } from "../../hooks/chat/useBookmarkTracking";
import { useTypingEmitter } from "../../hooks/chat/useTypingEmitter";
import { useTypingTracking } from "../../hooks/chat/useTypingTracking";
import { useNotifications } from "../../hooks/useNotifications";
import { useDockBadge } from "../../hooks/chat/useDockBadge";
import { useMenuEvents } from "../../hooks/useMenuEvents";
import { useDeepLinkNavigation } from "../../hooks/chat/useDeepLinkNavigation";
import { useViewRouteSync } from "../../hooks/chat/useViewRouteSync";
import { useChannelActions } from "../../hooks/chat/useChannelActions";
import { useMessageActions } from "../../hooks/chat/useMessageActions";
import { usePinnedMessages } from "../../hooks/chat/usePinnedMessages";
import { useChannelPopovers } from "../../hooks/chat/useChannelPopovers";
import { useFileDragOverlay } from "../../hooks/useFileDragOverlay";
import { useWorkspaceMembers } from "../../hooks/chat/useWorkspaceMembers";
import { ComposeView } from "../compose/ComposeView";
import { useChatSelectors, useChatStore } from "../../state/chat-store";
import { PinnedMessagesPopover } from "../channel/PinnedMessagesPopover";
import { ShareMessageDialog } from "../message/ShareMessageDialog";
import { AllUnreadsView } from "../unreads/AllUnreadsView";
import { SavedItemsView } from "../saved/SavedItemsView";
import { OutboxView } from "../outbox/OutboxView";
import { FilesView } from "../files/FilesView";
import { ChannelFilesPopover } from "../channel/ChannelFilesPopover";
import { BookmarksBar } from "../channel/BookmarksBar";
import { AddBookmarkDialog } from "../channel/AddBookmarkDialog";
import { ScheduledMessagesBanner } from "../message/ScheduledMessagesBanner";
import { ConnectionBanner } from "./ConnectionBanner";
import { useSavedMessageIds } from "../../hooks/chat/useSavedMessages";
import { useSlashCommands } from "../../hooks/chat/useSlashCommands";
import { X, Upload, Building2 } from "lucide-react";
import type { SearchResultItem } from "@openslaq/shared";
import { LoadingState, EmptyState, Button } from "../ui";

export function AppLayout() {
  const user = useCurrentUser();
  const { workspaceSlug, channelId: urlChannelId, dmChannelId: urlDmChannelId, messageId: urlMessageId } = useParams<{
    workspaceSlug: string;
    channelId: string;
    dmChannelId: string;
    messageId: string;
  }>();
  const slug = workspaceSlug ?? "";
  const { state, dispatch } = useChatStore();
  const { activeChannel, activeDm, activeGroupDm, currentChannelId } = useChatSelectors();
  const { createDm } = useDmActions(user, workspaceSlug);
  const { workspaceMembers, refresh: refreshMembers } = useWorkspaceMembers(workspaceSlug);
  const channelActions = useChannelActions(workspaceSlug);
  const messageActions = useMessageActions(workspaceSlug);
  const pins = usePinnedMessages(workspaceSlug);
  const popovers = useChannelPopovers(workspaceSlug);

  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const huddleActions = useHuddleActions();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<MessageInputHandle>(null);

  const handleFileDrop = useCallback((files: FileList) => {
    messageInputRef.current?.addFiles(files);
  }, []);

  const { isDraggingFiles } = useFileDragOverlay({
    dropRef: mainContentRef,
    onDrop: handleFileDrop,
  });

  useWorkspaceBootstrap(workspaceSlug, urlChannelId, urlDmChannelId);
  useViewRouteSync(workspaceSlug, urlChannelId, urlDmChannelId, urlMessageId);
  useUnreadTracking(user, workspaceSlug);
  usePresenceTracking();
  useHuddleTracking();
  useChannelMemberTracking(workspaceSlug);
  useCustomEmojiTracking();
  useBookmarkTracking();
  useNotifications();
  useDockBadge();
  useMenuEvents({
    onPreferences: () => window.dispatchEvent(new Event("openslaq:open-settings")),
    onNewMessage: () => messageInputRef.current?.focus(),
    onToggleSidebar: () => setSidebarVisible((v) => !v),
    onKeyboardShortcuts: () => {},
  });
  useDeepLinkNavigation(workspaceSlug);
  useScrollToMessage(currentChannelId, workspaceSlug);
  useSavedMessageIds(workspaceSlug);
  const slashCmds = useSlashCommands();

  const activeTypingChannelId = activeChannel?.id ?? activeDm?.channel.id ?? activeGroupDm?.channel.id;
  const { emitTyping } = useTypingEmitter(activeTypingChannelId);
  const typingUsers = useTypingTracking(activeTypingChannelId, user?.id, workspaceMembers, {
    onUnknownUser: refreshMembers,
  });

  const leftResize = useResizable({
    side: "right",
    min: 200,
    max: 400,
    defaultWidth: 260,
    storageKey: "openslaq-sidebar-width-left",
  });
  const rightResize = useResizable({
    side: "left",
    min: 300,
    max: 600,
    defaultWidth: 400,
    storageKey: "openslaq-sidebar-width-right",
  });

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectChannel = useCallback(
    (id: string) => {
      dispatch({ type: "workspace/selectChannel", channelId: id });
    },
    [dispatch],
  );

  const handleSelectDm = useCallback(
    (channelId: string) => {
      dispatch({ type: "workspace/selectDm", channelId });
    },
    [dispatch],
  );

  const handleSelectGroupDm = useCallback(
    (channelId: string) => {
      dispatch({ type: "workspace/selectGroupDm", channelId });
    },
    [dispatch],
  );

  const handleOpenThread = useCallback(
    (messageId: string) => {
      dispatch({ type: "workspace/openThread", messageId });
    },
    [dispatch],
  );

  const handleCloseThread = useCallback(() => {
    dispatch({ type: "workspace/closeThread" });
  }, [dispatch]);

  const handleOpenProfile = useCallback(
    (userId: string) => {
      dispatch({ type: "workspace/openProfile", userId });
    },
    [dispatch],
  );

  const handleCloseProfile = useCallback(() => {
    dispatch({ type: "workspace/closeProfile" });
  }, [dispatch]);

  const handleSendMessageFromProfile = useCallback(
    async (targetUserId: string) => {
      await createDm(targetUserId);
      dispatch({ type: "workspace/closeProfile" });
    },
    [createDm, dispatch],
  );

  const handleSelectUnreadsView = useCallback(() => {
    dispatch({ type: "workspace/selectUnreadsView" });
  }, [dispatch]);

  const handleSelectSavedView = useCallback(() => {
    dispatch({ type: "workspace/selectSavedView" });
  }, [dispatch]);

  const handleSelectOutboxView = useCallback(() => {
    dispatch({ type: "workspace/selectOutboxView" });
  }, [dispatch]);

  const handleSelectFilesView = useCallback(() => {
    dispatch({ type: "workspace/selectFilesView" });
  }, [dispatch]);

  const handleSelectComposeView = useCallback(() => {
    dispatch({ type: "workspace/selectComposeView" });
  }, [dispatch]);

  const handleNavigateToMessage = useCallback(
    (result: SearchResultItem) => {
      // Select the right channel/DM/group DM
      if (result.channelType === "group_dm") {
        dispatch({ type: "workspace/selectGroupDm", channelId: result.channelId });
      } else if (result.channelType === "dm") {
        dispatch({ type: "workspace/selectDm", channelId: result.channelId });
      } else {
        dispatch({ type: "workspace/selectChannel", channelId: result.channelId });
      }

      // If it's a thread reply, open the thread panel
      if (result.parentMessageId) {
        dispatch({ type: "workspace/openThread", messageId: result.parentMessageId });
      }

      // Set scroll target — for replies, navigate to the parent in channel view
      const targetMessageId = result.parentMessageId ?? result.messageId;
      dispatch({
        type: "navigation/setScrollTarget",
        scrollTarget: {
          channelId: result.channelId,
          messageId: targetMessageId,
          highlightMessageId: targetMessageId,
          parentMessageId: result.parentMessageId ?? null,
        },
      });
    },
    [dispatch],
  );

  const handleStartHuddle = useCallback(
    (channelId: string, channelName?: string) => {
      huddleActions.startHuddle(channelId, channelName);
    },
    [huddleActions],
  );

  const handleJoinHuddle = useCallback(
    (channelId: string, channelName?: string) => {
      huddleActions.joinHuddle(channelId, channelName);
    },
    [huddleActions],
  );

  const currentUserId = user?.id ?? "";
  const currentWorkspace = state.workspaces.find((ws) => ws.slug === workspaceSlug);
  const canManage = currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin";

  return (
    <div className="flex flex-col h-screen">
      <UpdateBanner />
      <div className="flex flex-1 min-h-0">
      {sidebarVisible && !state.ui.bootstrapError && (
        <>
          <Sidebar
            activeChannelId={state.activeChannelId}
            onSelectChannel={handleSelectChannel}
            channels={state.channels}
            activeDmId={state.activeDmId}
            onSelectDm={handleSelectDm}
            dms={state.dms}
            groupDms={state.groupDms}
            activeGroupDmId={state.activeGroupDmId}
            onSelectGroupDm={handleSelectGroupDm}
            currentUserId={currentUserId}
            workspaceSlug={slug}
            workspaces={state.workspaces}
            unreadCounts={state.unreadCounts}
            presence={state.presence}
            onOpenSearch={() => setSearchOpen(true)}
            onChannelCreated={channelActions.onChannelCreated}
            activeHuddles={state.activeHuddles}
            starredChannelIds={state.starredChannelIds}
            channelNotificationPrefs={state.channelNotificationPrefs}
            onSetNotificationLevel={channelActions.setNotificationLevel}
            activeView={state.activeView}
            onSelectUnreadsView={handleSelectUnreadsView}
            onSelectSavedView={handleSelectSavedView}
            onSelectOutboxView={handleSelectOutboxView}
            onSelectFilesView={handleSelectFilesView}
            onSelectComposeView={handleSelectComposeView}
            style={{ width: leftResize.width }}
          />
          <ResizeHandle
            testId="resize-handle-left"
            onMouseDown={leftResize.handleMouseDown}
            isDragging={leftResize.isDragging}
          />
        </>
      )}

      <div ref={mainContentRef} className="flex-1 min-w-0 flex flex-col bg-surface relative" data-testid="main-content">
        <ConnectionBanner />
        {state.ui.bootstrapError ? (
          <EmptyState
            icon={<Building2 className="w-full h-full" strokeWidth={1.5} />}
            title={state.ui.bootstrapError}
            subtitle={state.ui.bootstrapError.toLowerCase().includes("not found") ? "This workspace may not exist, or you may not have access to it." : undefined}
            action={
              <Button asChild>
                <Link to="/">Go to workspaces</Link>
              </Button>
            }
            className="flex-1"
          />
        ) : state.activeView === "unreads" ? (
          <AllUnreadsView
            workspaceSlug={slug}
            currentUserId={currentUserId}
            onNavigateToChannel={(channelId, messageId) => {
              dispatch({ type: "workspace/selectChannel", channelId });
              if (messageId) {
                dispatch({
                  type: "navigation/setScrollTarget",
                  scrollTarget: {
                    channelId,
                    messageId,
                    highlightMessageId: messageId,
                    parentMessageId: null,
                  },
                });
              }
            }}
            onOpenThread={handleOpenThread}
            onOpenProfile={handleOpenProfile}
          />
        ) : state.activeView === "saved" ? (
          <SavedItemsView
            workspaceSlug={slug}
            currentUserId={currentUserId}
            onNavigateToChannel={(channelId, messageId) => {
              dispatch({ type: "workspace/selectChannel", channelId });
              if (messageId) {
                dispatch({
                  type: "navigation/setScrollTarget",
                  scrollTarget: {
                    channelId,
                    messageId,
                    highlightMessageId: messageId,
                    parentMessageId: null,
                  },
                });
              }
            }}
            onOpenThread={handleOpenThread}
            onOpenProfile={handleOpenProfile}
            onUnsaveMessage={messageActions.unsaveMessage}
          />
        ) : state.activeView === "outbox" ? (
          <OutboxView
            workspaceSlug={slug}
            onNavigateToChannel={(channelId, messageId) => {
              dispatch({ type: "workspace/selectChannel", channelId });
              if (messageId) {
                dispatch({
                  type: "navigation/setScrollTarget",
                  scrollTarget: {
                    channelId,
                    messageId,
                    highlightMessageId: messageId,
                    parentMessageId: null,
                  },
                });
              }
            }}
          />
        ) : state.activeView === "files" ? (
          <FilesView
            workspaceSlug={slug}
            channels={state.channels}
            onNavigateToChannel={(channelId, messageId) => {
              dispatch({ type: "workspace/selectChannel", channelId });
              if (messageId) {
                dispatch({
                  type: "navigation/setScrollTarget",
                  scrollTarget: {
                    channelId,
                    messageId,
                    highlightMessageId: messageId,
                    parentMessageId: null,
                  },
                });
              }
            }}
          />
        ) : state.activeView === "compose" ? (
          <ComposeView
            workspaceSlug={slug}
            currentUserId={currentUserId}
            channels={state.channels}
            presence={state.presence}
            workspaceMembers={workspaceMembers}
            onSelectChannel={handleSelectChannel}
            onOpenThread={handleOpenThread}
            onOpenProfile={handleOpenProfile}
          />
        ) : activeChannel ? (
          <>
            <ChannelHeader
              channelName={activeChannel.name}
              channelId={activeChannel.id}
              channelType={activeChannel.type}
              channelCreatorId={activeChannel.createdBy}
              channelCreatedAt={activeChannel.createdAt}
              memberCount={activeChannel.memberCount}
              workspaceSlug={slug}
              presence={state.presence}
              onOpenProfile={handleOpenProfile}
              activeHuddle={state.activeHuddles[activeChannel.id] ?? null}
              currentHuddleChannelId={state.currentHuddleChannelId}
              onStartHuddle={() => handleStartHuddle(activeChannel.id, activeChannel.name)}
              onJoinHuddle={() => handleJoinHuddle(activeChannel.id, activeChannel.name)}
              canManageMembers={canManage || activeChannel.createdBy === currentUserId}
              description={activeChannel.description}
              onUpdateDescription={channelActions.updateDescription}
              isStarred={state.starredChannelIds.includes(activeChannel.id)}
              onToggleStar={channelActions.toggleStar}
              pinnedCount={pins.pinnedCount}
              onOpenPins={pins.togglePins}
              onOpenFiles={popovers.openChannelFiles}
              notificationLevel={state.channelNotificationPrefs[activeChannel.id]}
              onSetNotificationLevel={(level) => channelActions.setNotificationLevel(activeChannel.id, level)}
              isArchived={activeChannel.isArchived}
              canArchive={canManage}
              onArchive={channelActions.archiveChannel}
              onUnarchive={channelActions.unarchiveChannel}
              onAddBookmark={popovers.openAddBookmark}
              hasBookmarks={(state.channelBookmarks[activeChannel.id] ?? []).length > 0}
              onLeaveChannel={channelActions.leaveChannel}
            />
            <BookmarksBar
              bookmarks={state.channelBookmarks[activeChannel.id] ?? []}
              isArchived={activeChannel.isArchived}
              onAddBookmark={popovers.openAddBookmark}
              onRemoveBookmark={popovers.removeBookmark}
            />
            <AddBookmarkDialog
              open={popovers.addBookmarkOpen}
              onClose={popovers.closeAddBookmark}
              onAdd={popovers.addBookmark}
            />
            {pins.pinsOpen && (
              <div className="relative">
                <PinnedMessagesPopover
                  open={pins.pinsOpen}
                  onClose={pins.closePins}
                  messages={pins.pinnedMessages}
                  loading={pins.pinnedLoading}
                  onJumpToMessage={pins.jumpToPinnedMessage}
                  onUnpin={pins.unpinMessage}
                />
              </div>
            )}
            {popovers.channelFilesOpen && (
              <div className="relative">
                <ChannelFilesPopover
                  open={popovers.channelFilesOpen}
                  onClose={popovers.closeChannelFiles}
                  files={popovers.channelFiles.files}
                  loading={popovers.channelFiles.loading}
                  hasMore={popovers.channelFiles.nextCursor !== null}
                  onLoadMore={() => activeChannel && popovers.channelFiles.loadMore(activeChannel.id)}
                  onJumpToMessage={popovers.jumpToFileMessage}
                />
              </div>
            )}
            <MessageList channelId={activeChannel.id} onOpenThread={handleOpenThread} onOpenProfile={handleOpenProfile} onJoinHuddle={handleJoinHuddle} onPinMessage={pins.pinMessage} onUnpinMessage={pins.unpinMessage} onShareMessage={messageActions.shareMessage} onSaveMessage={messageActions.saveMessage} onUnsaveMessage={messageActions.unsaveMessage} savedMessageIds={state.savedMessageIds} ephemeralMessages={slashCmds.getEphemeralMessages(activeChannel.id)} onEphemeralMessage={slashCmds.addEphemeral} />
            <div className="relative">
              <TypingIndicator typingUsers={typingUsers} />
              {activeChannel.isArchived ? (
                <div data-testid="archived-channel-banner" className="px-4 pb-4">
                  <div className="rounded-lg border border-border-default bg-surface-raised px-4 py-3 text-sm text-secondary text-center">
                    This channel has been archived
                  </div>
                </div>
              ) : (
                <>
                  <ScheduledMessagesBanner channelId={activeChannel.id} workspaceSlug={slug} onViewScheduled={handleSelectOutboxView} />
                  <MessageInput ref={messageInputRef} channelId={activeChannel.id} channelName={activeChannel.name} externalDragDrop onTyping={emitTyping} slashCommands={slashCmds.commands} onSlashCommand={slashCmds.execute} />
                </>
              )}
            </div>
          </>
        ) : activeDm ? (
          <>
            <DmHeader
              otherUserName={activeDm.otherUser.displayName}
              isSelf={activeDm.otherUser.id === currentUserId}
              channelId={activeDm.channel.id}
              activeHuddle={state.activeHuddles[activeDm.channel.id] ?? null}
              currentHuddleChannelId={state.currentHuddleChannelId}
              onStartHuddle={() => handleStartHuddle(activeDm.channel.id, activeDm.otherUser.displayName)}
              onJoinHuddle={() => handleJoinHuddle(activeDm.channel.id, activeDm.otherUser.displayName)}
            />
            <MessageList channelId={activeDm.channel.id} onOpenThread={handleOpenThread} onOpenProfile={handleOpenProfile} onJoinHuddle={handleJoinHuddle} onShareMessage={messageActions.shareMessage} onSaveMessage={messageActions.saveMessage} onUnsaveMessage={messageActions.unsaveMessage} savedMessageIds={state.savedMessageIds} ephemeralMessages={slashCmds.getEphemeralMessages(activeDm.channel.id)} onEphemeralMessage={slashCmds.addEphemeral} />
            <div className="relative">
              <TypingIndicator typingUsers={typingUsers} />
              <ScheduledMessagesBanner channelId={activeDm.channel.id} workspaceSlug={slug} onViewScheduled={handleSelectOutboxView} />
              <MessageInput
                ref={messageInputRef}
                channelId={activeDm.channel.id}
                channelName={activeDm.otherUser.displayName}
                isDm
                externalDragDrop
                onTyping={emitTyping}
                slashCommands={slashCmds.commands}
                onSlashCommand={slashCmds.execute}
              />
            </div>
          </>
        ) : activeGroupDm ? (
          <>
            <DmHeader
              groupDmName={activeGroupDm.channel.displayName ?? activeGroupDm.members.map((m) => m.displayName).join(", ")}
              memberCount={activeGroupDm.members.length}
              channelId={activeGroupDm.channel.id}
              activeHuddle={state.activeHuddles[activeGroupDm.channel.id] ?? null}
              currentHuddleChannelId={state.currentHuddleChannelId}
              onStartHuddle={() => handleStartHuddle(activeGroupDm.channel.id, activeGroupDm.channel.displayName ?? "Group DM")}
              onJoinHuddle={() => handleJoinHuddle(activeGroupDm.channel.id, activeGroupDm.channel.displayName ?? "Group DM")}
            />
            <MessageList channelId={activeGroupDm.channel.id} onOpenThread={handleOpenThread} onOpenProfile={handleOpenProfile} onJoinHuddle={handleJoinHuddle} onShareMessage={messageActions.shareMessage} onSaveMessage={messageActions.saveMessage} onUnsaveMessage={messageActions.unsaveMessage} savedMessageIds={state.savedMessageIds} ephemeralMessages={slashCmds.getEphemeralMessages(activeGroupDm.channel.id)} onEphemeralMessage={slashCmds.addEphemeral} />
            <div className="relative">
              <TypingIndicator typingUsers={typingUsers} />
              <ScheduledMessagesBanner channelId={activeGroupDm.channel.id} workspaceSlug={slug} onViewScheduled={handleSelectOutboxView} />
              <MessageInput
                ref={messageInputRef}
                channelId={activeGroupDm.channel.id}
                channelName={activeGroupDm.channel.displayName ?? "Group DM"}
                isDm
                externalDragDrop
                onTyping={emitTyping}
                slashCommands={slashCmds.commands}
                onSlashCommand={slashCmds.execute}
              />
            </div>
          </>
        ) : state.ui.bootstrapLoading ? (
          <LoadingState label="Loading messages..." className="flex-1" />
        ) : (
          <div className="flex-1 flex items-center justify-center text-faint">
            Select a channel or DM to start chatting
          </div>
        )}

        {state.ui.mutationError && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-danger-border text-danger-text bg-danger-bg text-[13px]">
            <span>{state.ui.mutationError}</span>
            <button
              type="button"
              className="ml-2 shrink-0 hover:opacity-70"
              aria-label="Dismiss error"
              onClick={() => dispatch({ type: "mutations/error", error: null })}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isDraggingFiles && (
          <div className="absolute inset-0 bg-surface/80 z-20 flex flex-col items-center justify-center pointer-events-none" data-testid="drag-overlay">
            <Upload className="w-12 h-12 text-slaq-blue mb-3" />
            <span className="text-lg font-semibold text-primary">Upload file</span>
          </div>
        )}
      </div>

      {state.activeProfileUserId ? (
        <>
          <ResizeHandle
            testId="resize-handle-right"
            onMouseDown={rightResize.handleMouseDown}
            isDragging={rightResize.isDragging}
          />
          <UserProfileSidebar
            userId={state.activeProfileUserId}
            onClose={handleCloseProfile}
            onSendMessage={handleSendMessageFromProfile}
            style={{ width: rightResize.width }}
          />
        </>
      ) : state.activeThreadId && currentChannelId ? (
        <>
          <ResizeHandle
            testId="resize-handle-right"
            onMouseDown={rightResize.handleMouseDown}
            isDragging={rightResize.isDragging}
          />
          <ThreadPanel
            channelId={currentChannelId}
            parentMessageId={state.activeThreadId}
            onClose={handleCloseThread}
            onOpenProfile={handleOpenProfile}
            style={{ width: rightResize.width }}
          />
        </>
      ) : null}

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigateToMessage={handleNavigateToMessage}
        workspaceSlug={workspaceSlug}
      />
      <ShareMessageDialog
        open={messageActions.shareDialogMessage !== null}
        onClose={messageActions.closeShareDialog}
        message={messageActions.shareDialogMessage}
        channels={[
          ...state.channels.filter((ch) => !ch.isArchived),
          ...state.dms.map((dm) => dm.channel),
          ...state.groupDms.map((gdm) => gdm.channel),
        ]}
        dmChannelNames={new Map([
          ...state.dms.map((dm) => [dm.channel.id, dm.otherUser.displayName] as const),
          ...state.groupDms.map((gdm) => [gdm.channel.id, gdm.channel.displayName ?? gdm.members.map((m) => m.displayName).join(", ")] as const),
        ])}
        onShare={messageActions.confirmShare}
      />
      </div>
    </div>
  );
}
