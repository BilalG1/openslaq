import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Room,
  RoomEvent,
} from "livekit-client";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { Audio } from "expo-av";
import { Alert, Linking } from "react-native";
import type { ChannelId, UserId } from "@openslaq/shared";
import { authorizedHeaders, notifyHuddleLeave } from "@openslaq/client-core";
import { useAuth } from "./AuthContext";
import { useChatStore } from "./ChatStoreProvider";
import { buildParticipantSnapshot } from "./huddle-utils";
import { useServer } from "./ServerContext";

export interface HuddleParticipantInfo {
  userId: UserId;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
}

interface HuddleContextValue {
  channelId: ChannelId | null;
  connected: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  screenShareUserId: UserId | null;
  participants: HuddleParticipantInfo[];
  room: Room | null;
  error: string | null;
  minimized: boolean;
  joinHuddle: (channelId: ChannelId) => void;
  leaveHuddle: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  setMinimized: (value: boolean) => void;
}

const HuddleContext = createContext<HuddleContextValue | null>(null);

export function HuddleProvider({ children }: { children: ReactNode }) {
  const { authProvider, user } = useAuth();
  const { apiUrl: API_URL, apiClient } = useServer();
  const { state, dispatch } = useChatStore();
  const authProviderRef = useRef(authProvider);
  authProviderRef.current = authProvider;
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<Room | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareUserId, setScreenShareUserId] = useState<UserId | null>(null);
  const [participants, setParticipants] = useState<HuddleParticipantInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  const channelId = state.currentHuddleChannelId as ChannelId | null;

  // Show alert when huddle join fails
  useEffect(() => {
    if (error) {
      Alert.alert("Huddle Error", error);
    }
  }, [error]);

  const refreshParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const snapshot = buildParticipantSnapshot(room);
    if (!snapshot) return;
    setParticipants(snapshot.participants);
    setIsMuted(snapshot.isMuted);
    setIsCameraOn(snapshot.isCameraOn);
    setIsScreenSharing(snapshot.isScreenSharing);
    setScreenShareUserId(snapshot.screenShareUserId);
  }, []);

  // Connect/disconnect when channelId changes
  useEffect(() => {
    if (!channelId || !user) {
      // Disconnect if we left
      const room = roomRef.current;
      if (room) {
        room.disconnect();
        roomRef.current = null;
        setRoomState(null);
      }
      setConnected(false);
      setIsMuted(false);
      setIsCameraOn(false);
      setIsScreenSharing(false);
      setScreenShareUserId(null);
      setParticipants([]);
      setError(null);
      deactivateKeepAwake("huddle");
      return;
    }

    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    const notify = () => refreshParticipants();
    room
      .on(RoomEvent.ParticipantConnected, notify)
      .on(RoomEvent.ParticipantDisconnected, notify)
      .on(RoomEvent.TrackSubscribed, notify)
      .on(RoomEvent.TrackUnsubscribed, notify)
      .on(RoomEvent.TrackMuted, notify)
      .on(RoomEvent.TrackUnmuted, notify)
      .on(RoomEvent.ActiveSpeakersChanged, notify)
      .on(RoomEvent.LocalTrackPublished, notify)
      .on(RoomEvent.LocalTrackUnpublished, notify)
      .on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setParticipants([]);
      });

    // Optimistically populate activeHuddles
    dispatch({
      type: "huddle/started",
      huddle: {
        channelId: channelId as ChannelId,
        participants: [
          {
            userId: user.id as UserId,
            isMuted: false,
            isCameraOn: false,
            isScreenSharing: false,
            joinedAt: new Date().toISOString(),
          },
        ],
        startedAt: new Date().toISOString(),
        livekitRoom: null,
        screenShareUserId: null,
        messageId: null,
      },
    });

    (async () => {
      try {
        const headers = await authorizedHeaders(authProviderRef.current);
        if (cancelled) return;
        const res = await fetch(`${API_URL}/api/huddle/join`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ channelId }),
        });

        if (cancelled) return;

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const errorMsg = typeof body?.error === "string" ? body.error : `HTTP ${res.status}`;
          throw new Error(errorMsg);
        }

        const body = await res.json();
        if (typeof body?.token !== "string" || typeof body?.wsUrl !== "string") {
          throw new Error("Invalid huddle join response");
        }
        const { token, wsUrl } = body as { token: string; wsUrl: string };

        if (cancelled) return;

        await room.connect(wsUrl, token);
        if (cancelled) return;
        setConnected(true);
        try {
          const { granted } = await Audio.requestPermissionsAsync();
          if (granted) {
            await room.localParticipant.setMicrophoneEnabled(!isMutedRef.current);
          } else {
            setIsMuted(true);
          }
        } catch (micErr) {
          console.warn("Failed to enable microphone:", micErr);
          setIsMuted(true);
        }
        if (cancelled) return;
        setRoomState(room);
        setError(null);
        refreshParticipants();
        activateKeepAwakeAsync("huddle");
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to join huddle:", err);
        setError(err instanceof Error ? err.message : "Failed to join huddle");
        dispatch({ type: "huddle/ended", channelId: channelId as ChannelId });
        dispatch({ type: "huddle/setCurrentChannel", channelId: null });
      }
    })();

    return () => {
      cancelled = true;
      room.removeAllListeners();
      room.disconnect();
      if (roomRef.current === room) {
        roomRef.current = null;
        setRoomState(null);
      }
      deactivateKeepAwake("huddle");
    };
  }, [channelId, user?.id]);

  const joinHuddle = useCallback(
    (id: ChannelId) => {
      setMinimized(false);
      dispatch({ type: "huddle/setCurrentChannel", channelId: id });
    },
    [dispatch],
  );

  const leaveHuddle = useCallback(() => {
    const prevChannelId = channelId;
    setMinimized(false);
    dispatch({ type: "huddle/setCurrentChannel", channelId: null });
    if (prevChannelId) {
      dispatch({ type: "huddle/ended", channelId: prevChannelId as ChannelId });
    }
    notifyHuddleLeave({ api: apiClient, auth: authProviderRef.current });
  }, [channelId, dispatch, apiClient]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const enabled = room.localParticipant.isMicrophoneEnabled;
      if (!enabled) {
        const { granted, canAskAgain } = await Audio.requestPermissionsAsync();
        if (!granted) {
          if (!canAskAgain) {
            Alert.alert(
              "Microphone Access",
              "Microphone permission was denied. Enable it in Settings to unmute.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() },
              ],
            );
          }
          return;
        }
      }
      await room.localParticipant.setMicrophoneEnabled(!enabled);
      refreshParticipants();
    } catch (err) {
      console.warn("Failed to toggle microphone:", err);
    }
  }, [refreshParticipants]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const enabled = room.localParticipant.isCameraEnabled;
      await room.localParticipant.setCameraEnabled(!enabled);
      refreshParticipants();
    } catch (err) {
      console.warn("Failed to toggle camera:", err);
      Alert.alert(
        "Camera Access",
        "Camera permission is required. Enable it in Settings to use video.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ],
      );
    }
  }, [refreshParticipants]);

  const toggleScreenShare = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isScreenShareEnabled;
    room.localParticipant.setScreenShareEnabled(!enabled).then(() => {
      refreshParticipants();
    });
  }, [refreshParticipants]);

  const value: HuddleContextValue = {
    channelId,
    connected,
    isMuted,
    isCameraOn,
    isScreenSharing,
    screenShareUserId,
    participants,
    room: roomState,
    error,
    minimized,
    joinHuddle,
    leaveHuddle,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    setMinimized,
  };

  return (
    <HuddleContext.Provider value={value}>{children}</HuddleContext.Provider>
  );
}

export function useHuddle(): HuddleContextValue {
  const ctx = useContext(HuddleContext);
  if (!ctx) throw new Error("useHuddle must be used within HuddleProvider");
  return ctx;
}
