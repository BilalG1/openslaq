import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { useFileDragOverlay } from "../../hooks/useFileDragOverlay";
import { useWorkspaceMembersApi } from "../../hooks/api/useWorkspaceMembersApi";
import { useChatSelectors, useChatStore } from "../../state/chat-store";
import { useGalleryMode } from "../../gallery/gallery-context";
import { updateChannelDescription, archiveChannel, unarchiveChannel, starChannelOp, unstarChannelOp, pinMessageOp, unpinMessageOp, fetchPinnedMessages, setChannelNotificationPrefOp, shareMessageOp, saveMessageOp, unsaveMessageOp, fetchBookmarks, addBookmarkOp, removeBookmarkOp } from "@openslaq/client-core";
import { PinnedMessagesPopover } from "../channel/PinnedMessagesPopover";
import { ShareMessageDialog } from "../message/ShareMessageDialog";
import { AllUnreadsView } from "../unreads/AllUnreadsView";
import { SavedItemsView } from "../saved/SavedItemsView";
import { ScheduledMessagesView } from "../scheduled/ScheduledMessagesView";
import { FilesView } from "../files/FilesView";
import { ChannelFilesPopover } from "../channel/ChannelFilesPopover";
import { BookmarksBar } from "../channel/BookmarksBar";
import { AddBookmarkDialog } from "../channel/AddBookmarkDialog";
import { useChannelFiles } from "../../hooks/chat/useChannelFiles";
import { ScheduledMessagesBanner } from "../message/ScheduledMessagesBanner";
import { useSavedMessageIds } from "../../hooks/chat/useSavedMessages";
import { useSlashCommands } from "../../hooks/chat/useSlashCommands";
import { api as apiClient } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import type { SearchResultItem, Channel, ChannelNotifyLevel, Message } from "@openslaq/shared";

export function AppLayout() {
  const user = useCurrentUser();
  const { workspaceSlug, channelId: urlChannelId, dmChannelId: urlDmChannelId } = useParams<{
    workspaceSlug: string;
    channelId: string;
    dmChannelId: string;
  }>();
  const navigate = useNavigate();
  const { state, dispatch } = useChatStore();
  const { activeChannel, activeDm, activeGroupDm, currentChannelId } = useChatSelectors();
  const { createDm, createGroupDm } = useDmActions(user, workspaceSlug);
  const { listMembers } = useWorkspaceMembersApi();

  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<import("@openslaq/shared").Message[]>([]);
  const [pinnedLoading, setPinnedLoading] = useState(false);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; displayName: string }>>([]);
  const [shareDialogMessage, setShareDialogMessage] = useState<Message | null>(null);
  const [channelFilesOpen, setChannelFilesOpen] = useState(false);
  const [addBookmarkOpen, setAddBookmarkOpen] = useState(false);
  const channelFiles = useChannelFiles(workspaceSlug);
  const huddleActions = useHuddleActions();
  const isGallery = useGalleryMode();
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

  // Deep-link support for /unreads URL
  useEffect(() => {
    if (isGallery || state.ui.bootstrapLoading || !workspaceSlug) return;
    if (window.location.pathname.endsWith("/unreads") && state.activeView !== "unreads") {
      dispatch({ type: "workspace/selectUnreadsView" });
    }
    if (window.location.pathname.endsWith("/saved") && state.activeView !== "saved") {
      dispatch({ type: "workspace/selectSavedView" });
    }
    if (window.location.pathname.endsWith("/scheduled") && state.activeView !== "scheduled") {
      dispatch({ type: "workspace/selectScheduledView" });
    }
    if (window.location.pathname.endsWith("/files") && state.activeView !== "files") {
      dispatch({ type: "workspace/selectFilesView" });
    }
  }, [isGallery, state.ui.bootstrapLoading, workspaceSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync store state → URL (one-way: store is source of truth)
  useEffect(() => {
    if (isGallery || state.ui.bootstrapLoading || !workspaceSlug) return;
    const base = `/w/${workspaceSlug}`;
    if (state.activeView === "unreads") {
      const target = `${base}/unreads`;
      if (!window.location.pathname.endsWith("/unreads")) {
        navigate(target, { replace: true });
      }
    } else if (state.activeView === "saved") {
      const target = `${base}/saved`;
      if (!window.location.pathname.endsWith("/saved")) {
        navigate(target, { replace: true });
      }
    } else if (state.activeView === "scheduled") {
      const target = `${base}/scheduled`;
      if (!window.location.pathname.endsWith("/scheduled")) {
        navigate(target, { replace: true });
      }
    } else if (state.activeView === "files") {
      const target = `${base}/files`;
      if (!window.location.pathname.endsWith("/files")) {
        navigate(target, { replace: true });
      }
    } else if (state.activeGroupDmId) {
      const target = `${base}/dm/${state.activeGroupDmId}`;
      if (urlDmChannelId !== state.activeGroupDmId) {
        navigate(target, { replace: true });
      }
    } else if (state.activeDmId) {
      const target = `${base}/dm/${state.activeDmId}`;
      if (urlDmChannelId !== state.activeDmId) {
        navigate(target, { replace: true });
      }
    } else if (state.activeChannelId) {
      const target = `${base}/c/${state.activeChannelId}`;
      if (urlChannelId !== state.activeChannelId) {
        navigate(target, { replace: true });
      }
    }
  }, [isGallery, state.activeView, state.activeChannelId, state.activeDmId, state.activeGroupDmId, state.ui.bootstrapLoading, workspaceSlug, urlChannelId, urlDmChannelId, navigate]);
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

  useEffect(() => {
    if (!workspaceSlug) {
      setWorkspaceMembers([]);
      return;
    }
    let cancelled = false;
    listMembers(workspaceSlug)
      .then((members) => {
        if (cancelled) return;
        setWorkspaceMembers(members.map((member) => ({ id: member.id, displayName: member.displayName })));
      })
      .catch(() => {
        if (cancelled) return;
        setWorkspaceMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug, listMembers]);

  const activeTypingChannelId = activeChannel?.id ?? activeDm?.channel.id ?? activeGroupDm?.channel.id;
  const { emitTyping } = useTypingEmitter(activeTypingChannelId);
  const typingUsers = useTypingTracking(activeTypingChannelId, user?.id, workspaceMembers);

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

  const handleStartGroupDm = useCallback(
    async (memberIds: string[]) => {
      await createGroupDm(memberIds);
    },
    [createGroupDm],
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

  const handleStartDm = useCallback(
    async (targetUserId: string) => {
      await createDm(targetUserId);
    },
    [createDm],
  );

  const handleChannelCreated = useCallback(
    (channel: Channel) => {
      dispatch({ type: "workspace/addChannel", channel });
      dispatch({ type: "workspace/selectChannel", channelId: channel.id });
    },
    [dispatch],
  );

  const handleSelectUnreadsView = useCallback(() => {
    dispatch({ type: "workspace/selectUnreadsView" });
  }, [dispatch]);

  const handleSelectSavedView = useCallback(() => {
    dispatch({ type: "workspace/selectSavedView" });
  }, [dispatch]);

  const handleSelectScheduledView = useCallback(() => {
    dispatch({ type: "workspace/selectScheduledView" });
  }, [dispatch]);

  const handleSelectFilesView = useCallback(() => {
    dispatch({ type: "workspace/selectFilesView" });
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
          messageId: targetMessageId,
          highlightMessageId: targetMessageId,
        },
      });
    },
    [dispatch],
  );

  const auth = useAuthProvider();

  const handleUpdateDescription = useCallback(
    (description: string | null) => {
      if (!workspaceSlug || !activeChannel) return;
      const deps = { api: apiClient, auth, dispatch, getState: () => state };
      void updateChannelDescription(deps, {
        workspaceSlug,
        channelId: activeChannel.id as Parameters<typeof updateChannelDescription>[1]["channelId"],
        description,
      });
    },
    [auth, dispatch, state, workspaceSlug, activeChannel],
  );

  const handleArchiveChannel = useCallback(() => {
    if (!workspaceSlug || !activeChannel) return;
    const deps = { api: apiClient, auth, dispatch, getState: () => state };
    void archiveChannel(deps, {
      workspaceSlug,
      channelId: activeChannel.id as Parameters<typeof archiveChannel>[1]["channelId"],
    });
  }, [auth, dispatch, state, workspaceSlug, activeChannel]);

  const handleUnarchiveChannel = useCallback(() => {
    if (!workspaceSlug || !activeChannel) return;
    const deps = { api: apiClient, auth, dispatch, getState: () => state };
    void unarchiveChannel(deps, {
      workspaceSlug,
      channelId: activeChannel.id as Parameters<typeof unarchiveChannel>[1]["channelId"],
    });
  }, [auth, dispatch, state, workspaceSlug, activeChannel]);

  const handleToggleStar = useCallback(() => {
    if (!workspaceSlug || !activeChannel) return;
    const deps = { api: apiClient, auth, dispatch, getState: () => state };
    const isStarred = state.starredChannelIds.includes(activeChannel.id);
    if (isStarred) {
      void unstarChannelOp(deps, { slug: workspaceSlug, channelId: activeChannel.id });
    } else {
      void starChannelOp(deps, { slug: workspaceSlug, channelId: activeChannel.id });
    }
  }, [auth, dispatch, state, workspaceSlug, activeChannel]);

  const handleSetNotificationLevel = useCallback(
    (channelId: string, level: ChannelNotifyLevel) => {
      if (!workspaceSlug) return;
      const deps = { api: apiClient, auth, dispatch, getState: () => state };
      void setChannelNotificationPrefOp(deps, { slug: workspaceSlug, channelId, level });
    },
    [auth, dispatch, state, workspaceSlug],
  );

  const handlePinMessage = useCallback(
    (messageId: string) => {
      if (!workspaceSlug || !currentChannelId) return;
      const deps = { api: apiClient, auth, dispatch, getState: () => state };
      void pinMessageOp(deps, { workspaceSlug, channelId: currentChannelId, messageId });
      setPinnedCount((c) => c + 1);
    },
    [auth, dispatch, state, workspaceSlug, currentChannelId],
  );

  const handleUnpinMessage = useCallback(
    (messageId: string) => {
      if (!workspaceSlug || !currentChannelId) return;
      const deps = { api: apiClient, auth, dispatch, getState: () => state };
      void unpinMessageOp(deps, { workspaceSlug, channelId: currentChannelId, messageId });
      setPinnedCount((c) => Math.max(0, c - 1));
      setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [auth, dispatch, state, workspaceSlug, currentChannelId],
  );

  const handleSaveMessage = useCallback(
    (messageId: string) => {
      if (!workspaceSlug || !currentChannelId) return;
      const deps = { api: apiClient, auth, dispatch, getState: () => state };
      void saveMessageOp(deps, { workspaceSlug, channelId: currentChannelId, messageId });
    },
    [auth, dispatch, state, workspaceSlug, currentChannelId],
  );

  const handleUnsaveMessage = useCallback(
    (messageId: string, channelId?: string) => {
      if (!workspaceSlug) return;
      const ch = channelId ?? currentChannelId;
      if (!ch) return;
      const deps = { api: apiClient, auth, dispatch, getState: () => state };
      void unsaveMessageOp(deps, { workspaceSlug, channelId: ch, messageId });
    },
    [auth, dispatch, state, workspaceSlug, currentChannelId],
  );

  const handleShareMessage = useCallback(
    (messageId: string) => {
      const msg = state.messagesById[messageId];
      if (msg) setShareDialogMessage(msg);
    },
    [state.messagesById],
  );

  const handleConfirmShare = useCallback(
    (destinationChannelId: string, comment: string) => {
      if (!workspaceSlug || !shareDialogMessage) return;
      const deps = { api: apiClient, auth, dispatch, getState: () => state };
      void shareMessageOp(deps, {
        workspaceSlug,
        destinationChannelId,
        sharedMessageId: shareDialogMessage.id,
        comment,
      });
      setShareDialogMessage(null);
    },
    [auth, dispatch, state, workspaceSlug, shareDialogMessage],
  );

  const handleOpenChannelFiles = useCallback(() => {
    if (isGallery || !activeChannel) return;
    setChannelFilesOpen(true);
    void channelFiles.loadFiles(activeChannel.id);
  }, [isGallery, activeChannel, channelFiles]);

  const handleJumpToFileMessage = useCallback(
    (channelId: string, messageId: string) => {
      dispatch({ type: "workspace/selectChannel", channelId });
      dispatch({
        type: "navigation/setScrollTarget",
        scrollTarget: { messageId, highlightMessageId: messageId },
      });
    },
    [dispatch],
  );

  const handleOpenPins = useCallback(async () => {
    if (isGallery || !workspaceSlug || !activeChannel) return;
    setPinsOpen(true);
    setPinnedLoading(true);
    try {
      const deps = { api: apiClient, auth, dispatch, getState: () => state };
      const msgs = await fetchPinnedMessages(deps, { workspaceSlug, channelId: activeChannel.id });
      setPinnedMessages(msgs);
      setPinnedCount(msgs.length);
    } catch {
      setPinnedMessages([]);
    } finally {
      setPinnedLoading(false);
    }
  }, [auth, dispatch, isGallery, state, workspaceSlug, activeChannel]);

  // Close channel-specific popovers when active channel changes
  useEffect(() => {
    setPinsOpen(false);
    setChannelFilesOpen(false);
    if (!activeChannel) setPinnedCount(0);
  }, [activeChannel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh pinned count when channel changes
  useEffect(() => {
    if (isGallery || !workspaceSlug || !activeChannel) {
      return;
    }
    let cancelled = false;
    const deps = { api: apiClient, auth, dispatch, getState: () => state };
    fetchPinnedMessages(deps, { workspaceSlug, channelId: activeChannel.id })
      .then((msgs) => {
        if (!cancelled) setPinnedCount(msgs.length);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [auth, dispatch, isGallery, workspaceSlug, activeChannel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch bookmarks when channel changes
  useEffect(() => {
    if (isGallery || !workspaceSlug || !activeChannel) return;
    const deps = { api: apiClient, auth, dispatch, getState: () => state };
    fetchBookmarks(deps, { workspaceSlug, channelId: activeChannel.id }).catch(() => {});
  }, [auth, dispatch, isGallery, state, workspaceSlug, activeChannel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddBookmark = useCallback(
    (url: string, title: string) => {
      if (!workspaceSlug || !activeChannel) return;
      const deps = { api: apiClient, auth, dispatch, getState: () => state };
      void addBookmarkOp(deps, { workspaceSlug, channelId: activeChannel.id, url, title });
    },
    [auth, dispatch, state, workspaceSlug, activeChannel],
  );

  const handleRemoveBookmark = useCallback(
    (bookmarkId: string) => {
      if (!workspaceSlug || !activeChannel) return;
      const deps = { api: apiClient, auth, dispatch, getState: () => state };
      void removeBookmarkOp(deps, { workspaceSlug, channelId: activeChannel.id, bookmarkId });
    },
    [auth, dispatch, state, workspaceSlug, activeChannel],
  );

  const handleJumpToPinnedMessage = useCallback(
    (messageId: string) => {
      dispatch({
        type: "navigation/setScrollTarget",
        scrollTarget: { messageId, highlightMessageId: messageId },
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
      {sidebarVisible && (
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
            onStartGroupDm={handleStartGroupDm}
            currentUserId={currentUserId}
            onStartDm={handleStartDm}
            workspaceSlug={workspaceSlug ?? ""}
            workspaces={state.workspaces}
            unreadCounts={state.unreadCounts}
            presence={state.presence}
            onOpenSearch={() => setSearchOpen(true)}
            onChannelCreated={handleChannelCreated}
            activeHuddles={state.activeHuddles}
            starredChannelIds={state.starredChannelIds}
            channelNotificationPrefs={state.channelNotificationPrefs}
            onSetNotificationLevel={handleSetNotificationLevel}
            activeView={state.activeView}
            onSelectUnreadsView={handleSelectUnreadsView}
            onSelectSavedView={handleSelectSavedView}
            onSelectScheduledView={handleSelectScheduledView}
            onSelectFilesView={handleSelectFilesView}
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
        {state.ui.bootstrapLoading ? (
          <div className="flex-1 flex items-center justify-center text-faint">
            Loading workspace...
          </div>
        ) : state.ui.bootstrapError ? (
          <div className="flex-1 flex items-center justify-center text-danger-text">
            {state.ui.bootstrapError}
          </div>
        ) : state.activeView === "unreads" ? (
          <AllUnreadsView
            workspaceSlug={workspaceSlug ?? ""}
            currentUserId={currentUserId}
            onNavigateToChannel={(channelId, messageId) => {
              dispatch({ type: "workspace/selectChannel", channelId });
              if (messageId) {
                dispatch({
                  type: "navigation/setScrollTarget",
                  scrollTarget: { messageId, highlightMessageId: messageId },
                });
              }
            }}
            onOpenThread={handleOpenThread}
            onOpenProfile={handleOpenProfile}
          />
        ) : state.activeView === "saved" ? (
          <SavedItemsView
            workspaceSlug={workspaceSlug ?? ""}
            currentUserId={currentUserId}
            onNavigateToChannel={(channelId, messageId) => {
              dispatch({ type: "workspace/selectChannel", channelId });
              if (messageId) {
                dispatch({
                  type: "navigation/setScrollTarget",
                  scrollTarget: { messageId, highlightMessageId: messageId },
                });
              }
            }}
            onOpenThread={handleOpenThread}
            onOpenProfile={handleOpenProfile}
            onUnsaveMessage={handleUnsaveMessage}
          />
        ) : state.activeView === "scheduled" ? (
          <ScheduledMessagesView
            workspaceSlug={workspaceSlug ?? ""}
            onNavigateToChannel={(channelId, messageId) => {
              dispatch({ type: "workspace/selectChannel", channelId });
              if (messageId) {
                dispatch({
                  type: "navigation/setScrollTarget",
                  scrollTarget: { messageId, highlightMessageId: messageId },
                });
              }
            }}
          />
        ) : state.activeView === "files" ? (
          <FilesView
            workspaceSlug={workspaceSlug ?? ""}
            channels={state.channels}
            onNavigateToChannel={(channelId, messageId) => {
              dispatch({ type: "workspace/selectChannel", channelId });
              if (messageId) {
                dispatch({
                  type: "navigation/setScrollTarget",
                  scrollTarget: { messageId, highlightMessageId: messageId },
                });
              }
            }}
          />
        ) : activeChannel ? (
          <>
            <ChannelHeader
              channelName={activeChannel.name}
              channelId={activeChannel.id}
              channelType={activeChannel.type}
              channelCreatorId={activeChannel.createdBy}
              memberCount={activeChannel.memberCount}
              workspaceSlug={workspaceSlug ?? ""}
              presence={state.presence}
              onOpenProfile={handleOpenProfile}
              activeHuddle={state.activeHuddles[activeChannel.id] ?? null}
              currentHuddleChannelId={state.currentHuddleChannelId}
              onStartHuddle={() => handleStartHuddle(activeChannel.id, activeChannel.name)}
              onJoinHuddle={() => handleJoinHuddle(activeChannel.id, activeChannel.name)}
              canManageMembers={canManage || activeChannel.createdBy === currentUserId}
              description={activeChannel.description}
              onUpdateDescription={handleUpdateDescription}
              isStarred={state.starredChannelIds.includes(activeChannel.id)}
              onToggleStar={handleToggleStar}
              pinnedCount={pinnedCount}
              onOpenPins={handleOpenPins}
              onOpenFiles={handleOpenChannelFiles}
              notificationLevel={state.channelNotificationPrefs[activeChannel.id]}
              onSetNotificationLevel={(level) => handleSetNotificationLevel(activeChannel.id, level)}
              isArchived={activeChannel.isArchived}
              canArchive={canManage}
              onArchive={handleArchiveChannel}
              onUnarchive={handleUnarchiveChannel}
            />
            <BookmarksBar
              bookmarks={state.channelBookmarks[activeChannel.id] ?? []}
              isArchived={activeChannel.isArchived}
              onAddBookmark={() => setAddBookmarkOpen(true)}
              onRemoveBookmark={handleRemoveBookmark}
            />
            <AddBookmarkDialog
              open={addBookmarkOpen}
              onClose={() => setAddBookmarkOpen(false)}
              onAdd={handleAddBookmark}
            />
            {pinsOpen && (
              <div className="relative">
                <PinnedMessagesPopover
                  open={pinsOpen}
                  onClose={() => setPinsOpen(false)}
                  messages={pinnedMessages}
                  loading={pinnedLoading}
                  onJumpToMessage={handleJumpToPinnedMessage}
                  onUnpin={handleUnpinMessage}
                />
              </div>
            )}
            {channelFilesOpen && (
              <div className="relative">
                <ChannelFilesPopover
                  open={channelFilesOpen}
                  onClose={() => setChannelFilesOpen(false)}
                  files={channelFiles.files}
                  loading={channelFiles.loading}
                  hasMore={channelFiles.nextCursor !== null}
                  onLoadMore={() => activeChannel && channelFiles.loadMore(activeChannel.id)}
                  onJumpToMessage={handleJumpToFileMessage}
                />
              </div>
            )}
            <MessageList channelId={activeChannel.id} onOpenThread={handleOpenThread} onOpenProfile={handleOpenProfile} onJoinHuddle={handleJoinHuddle} onPinMessage={handlePinMessage} onUnpinMessage={handleUnpinMessage} onShareMessage={handleShareMessage} onSaveMessage={handleSaveMessage} onUnsaveMessage={handleUnsaveMessage} savedMessageIds={state.savedMessageIds} ephemeralMessages={slashCmds.getEphemeralMessages(activeChannel.id)} onEphemeralMessage={slashCmds.addEphemeral} />
            <TypingIndicator typingUsers={typingUsers} />
            {activeChannel.isArchived ? (
              <div data-testid="archived-channel-banner" className="px-4 pb-4">
                <div className="rounded-lg border border-border-default bg-surface-raised px-4 py-3 text-sm text-secondary text-center">
                  This channel has been archived
                </div>
              </div>
            ) : (
              <>
                <ScheduledMessagesBanner channelId={activeChannel.id} workspaceSlug={workspaceSlug ?? ""} onViewScheduled={handleSelectScheduledView} />
                <MessageInput ref={messageInputRef} channelId={activeChannel.id} channelName={activeChannel.name} externalDragDrop onTyping={emitTyping} slashCommands={slashCmds.commands} onSlashCommand={slashCmds.execute} />
              </>
            )}
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
            <MessageList channelId={activeDm.channel.id} onOpenThread={handleOpenThread} onOpenProfile={handleOpenProfile} onJoinHuddle={handleJoinHuddle} onShareMessage={handleShareMessage} onSaveMessage={handleSaveMessage} onUnsaveMessage={handleUnsaveMessage} savedMessageIds={state.savedMessageIds} ephemeralMessages={slashCmds.getEphemeralMessages(activeDm.channel.id)} onEphemeralMessage={slashCmds.addEphemeral} />
            <TypingIndicator typingUsers={typingUsers} />
            <ScheduledMessagesBanner channelId={activeDm.channel.id} workspaceSlug={workspaceSlug ?? ""} onViewScheduled={handleSelectScheduledView} />
            <MessageInput
              ref={messageInputRef}
              channelId={activeDm.channel.id}
              channelName={activeDm.otherUser.displayName}
              externalDragDrop
              onTyping={emitTyping}
              slashCommands={slashCmds.commands}
              onSlashCommand={slashCmds.execute}
            />
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
            <MessageList channelId={activeGroupDm.channel.id} onOpenThread={handleOpenThread} onOpenProfile={handleOpenProfile} onJoinHuddle={handleJoinHuddle} onShareMessage={handleShareMessage} onSaveMessage={handleSaveMessage} onUnsaveMessage={handleUnsaveMessage} savedMessageIds={state.savedMessageIds} ephemeralMessages={slashCmds.getEphemeralMessages(activeGroupDm.channel.id)} onEphemeralMessage={slashCmds.addEphemeral} />
            <TypingIndicator typingUsers={typingUsers} />
            <ScheduledMessagesBanner channelId={activeGroupDm.channel.id} workspaceSlug={workspaceSlug ?? ""} onViewScheduled={handleSelectScheduledView} />
            <MessageInput
              ref={messageInputRef}
              channelId={activeGroupDm.channel.id}
              channelName={activeGroupDm.channel.displayName ?? "Group DM"}
              externalDragDrop
              onTyping={emitTyping}
              slashCommands={slashCmds.commands}
              onSlashCommand={slashCmds.execute}
            />
          </>
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {isDraggingFiles && (
          <div className="absolute inset-0 bg-surface/80 z-20 flex flex-col items-center justify-center pointer-events-none" data-testid="drag-overlay">
            <svg className="w-12 h-12 text-slaq-blue mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
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
        open={shareDialogMessage !== null}
        onClose={() => setShareDialogMessage(null)}
        message={shareDialogMessage}
        channels={[
          ...state.channels.filter((ch) => !ch.isArchived),
          ...state.dms.map((dm) => dm.channel),
          ...state.groupDms.map((gdm) => gdm.channel),
        ]}
        dmChannelNames={new Map([
          ...state.dms.map((dm) => [dm.channel.id, dm.otherUser.displayName] as const),
          ...state.groupDms.map((gdm) => [gdm.channel.id, gdm.channel.displayName ?? gdm.members.map((m) => m.displayName).join(", ")] as const),
        ])}
        onShare={handleConfirmShare}
      />
      </div>
    </div>
  );
}
