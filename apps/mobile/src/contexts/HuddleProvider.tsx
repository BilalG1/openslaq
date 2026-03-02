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
  ConnectionState,
} from "livekit-client";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import type { ChannelId, UserId } from "@openslaq/shared";
import { authorizedHeaders } from "@openslaq/client-core";
import { useAuth } from "./AuthContext";
import { useChatStore } from "./ChatStoreProvider";
import { env } from "../lib/env";

const API_URL = env.EXPO_PUBLIC_API_URL;

export interface HuddleParticipantInfo {
  userId: string;
  isMuted: boolean;
  isCameraOn: boolean;
}

interface HuddleContextValue {
  channelId: string | null;
  connected: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  participants: HuddleParticipantInfo[];
  room: Room | null;
  error: string | null;
  joinHuddle: (channelId: string) => void;
  leaveHuddle: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const HuddleContext = createContext<HuddleContextValue | null>(null);

export function HuddleProvider({ children }: { children: ReactNode }) {
  const { authProvider, user } = useAuth();
  const { state, dispatch } = useChatStore();
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [participants, setParticipants] = useState<HuddleParticipantInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const channelId = state.currentHuddleChannelId;

  const refreshParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) {
      return;
    }

    const infos: HuddleParticipantInfo[] = [];

    // Local participant
    const local = room.localParticipant;
    if (local) {
      infos.push({
        userId: local.identity,
        isMuted: !local.isMicrophoneEnabled,
        isCameraOn: local.isCameraEnabled,
      });
      setIsMuted(!local.isMicrophoneEnabled);
      setIsCameraOn(local.isCameraEnabled);
    }

    // Remote participants
    for (const p of room.remoteParticipants.values()) {
      let muted = true;
      let camera = false;
      for (const pub of p.trackPublications.values()) {
        if (pub.source === "microphone") {
          muted = pub.isMuted;
        } else if (pub.source === "camera") {
          camera = !pub.isMuted && !!pub.track;
        }
      }
      infos.push({
        userId: p.identity,
        isMuted: muted,
        isCameraOn: camera,
      });
    }

    setParticipants(infos);
  }, []);

  // Connect/disconnect when channelId changes
  useEffect(() => {
    if (!channelId || !user) {
      // Disconnect if we left
      const room = roomRef.current;
      if (room) {
        room.disconnect();
        roomRef.current = null;
      }
      setConnected(false);
      setIsMuted(false);
      setIsCameraOn(false);
      setParticipants([]);
      setError(null);
      deactivateKeepAwake("huddle");
      return;
    }

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
        const headers = await authorizedHeaders(authProvider);
        const res = await fetch(`${API_URL}/api/huddle/join`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ channelId }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({ error: "Unknown error" }))) as {
            error?: string;
          };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }

        const { token, wsUrl } = (await res.json()) as {
          token: string;
          wsUrl: string;
        };

        await room.connect(wsUrl, token);
        await room.localParticipant.setMicrophoneEnabled(true);
        setConnected(true);
        setError(null);
        refreshParticipants();
        activateKeepAwakeAsync("huddle");
      } catch (err) {
        console.error("Failed to join huddle:", err);
        setError(err instanceof Error ? err.message : "Failed to join huddle");
        dispatch({ type: "huddle/setCurrentChannel", channelId: null });
      }
    })();

    return () => {
      room.disconnect();
      if (roomRef.current === room) {
        roomRef.current = null;
      }
      deactivateKeepAwake("huddle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, user?.id]);

  const joinHuddle = useCallback(
    (id: string) => {
      dispatch({ type: "huddle/setCurrentChannel", channelId: id });
    },
    [dispatch],
  );

  const leaveHuddle = useCallback(() => {
    const prevChannelId = channelId;
    dispatch({ type: "huddle/setCurrentChannel", channelId: null });
    if (prevChannelId) {
      dispatch({ type: "huddle/ended", channelId: prevChannelId as ChannelId });
    }
  }, [channelId, dispatch]);

  const toggleMute = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isMicrophoneEnabled;
    room.localParticipant.setMicrophoneEnabled(!enabled).then(() => {
      refreshParticipants();
    });
  }, [refreshParticipants]);

  const toggleCamera = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isCameraEnabled;
    room.localParticipant.setCameraEnabled(!enabled).then(() => {
      refreshParticipants();
    });
  }, [refreshParticipants]);

  const value: HuddleContextValue = {
    channelId,
    connected,
    isMuted,
    isCameraOn,
    participants,
    room: roomRef.current,
    error,
    joinHuddle,
    leaveHuddle,
    toggleMute,
    toggleCamera,
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
