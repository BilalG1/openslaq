import { useEffect, useRef, useCallback, useState } from "react";
import { HuddleClient, type HuddleMediaState } from "@openslaq/huddle/client";
import type { ChannelId, UserId } from "@openslaq/shared";
import { useChatStore } from "../../state/chat-store";
import { useCurrentUser } from "../useCurrentUser";
import { authorizedHeaders } from "../../lib/api-client";
import { env } from "../../env";
const API_URL = env.VITE_API_URL;

// ── Error classification ──────────────────────────────────────

export interface PermissionAlert {
  title: string;
  description: string;
}

type DeviceKind = "microphone" | "camera" | "screen";

export function classifyMediaError(err: unknown, device: DeviceKind): PermissionAlert | null {
  if (!(err instanceof DOMException)) {
    // Generic error (e.g. device switch failure)
    return {
      title: "Could not switch device",
      description: "The selected device is unavailable. Try a different one.",
    };
  }

  // User cancelled the screen share picker — not an error
  if (device === "screen" && err.name === "NotAllowedError") {
    return null;
  }

  const deviceLabel = device === "screen" ? "Screen sharing" : device === "camera" ? "Camera" : "Microphone";

  switch (err.name) {
    case "NotAllowedError":
      return {
        title: `${deviceLabel} blocked`,
        description: `Allow ${device} access in your browser settings, then try again.`,
      };
    case "NotFoundError":
      return {
        title: `No ${device} found`,
        description: `Connect a ${device} and try again.`,
      };
    case "NotReadableError":
      return {
        title: `${deviceLabel} unavailable`,
        description: `Your ${device} may be in use by another app. Close other apps and try again.`,
      };
    default:
      return {
        title: `${deviceLabel} blocked`,
        description: "Your browser or system settings don't allow this. Check your settings and try again.",
      };
  }
}

// ── Hook ──────────────────────────────────────────────────────

export interface UseHuddleMediaReturn {
  mediaState: HuddleMediaState | null;
  error: string | null;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  permissionAlert: PermissionAlert | null;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  switchAudioDevice: (deviceId: string) => void;
  switchVideoDevice: (deviceId: string) => void;
  dismissPermissionAlert: () => void;
}

export function useHuddleMedia(): UseHuddleMediaReturn {
  const user = useCurrentUser();
  const { state, dispatch } = useChatStore();
  const clientRef = useRef<HuddleClient | null>(null);
  const prevChannelIdRef = useRef<string | null>(null);
  const [mediaState, setMediaState] = useState<HuddleMediaState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionAlert, setPermissionAlert] = useState<PermissionAlert | null>(null);
  // Local optimistic state for mute/camera/screenshare — works even without LiveKit connection
  const [localMuted, setLocalMuted] = useState(false);
  const [localCameraOn, setLocalCameraOn] = useState(false);
  const [localScreenSharing, setLocalScreenSharing] = useState(false);

  const channelId = state.currentHuddleChannelId;

  // Create/destroy HuddleClient when huddle channel changes
  useEffect(() => {
    if (!channelId || !user) {
      // Clean up optimistic activeHuddles entry when leaving
      if (prevChannelIdRef.current) {
        dispatch({ type: "huddle/ended", channelId: prevChannelIdRef.current as ChannelId });
        prevChannelIdRef.current = null;
      }
      // Clean up if we left the huddle
      if (clientRef.current) {
        clientRef.current.destroy();
        clientRef.current = null;
        setMediaState(null);
      }
      setLocalMuted(false);
      setLocalCameraOn(false);
      setLocalScreenSharing(false);
      return;
    }

    prevChannelIdRef.current = channelId;

    const client = new HuddleClient();
    clientRef.current = client;

    const unsubscribe = client.subscribe((s) => {
      setMediaState(s);
      if (s.localParticipant) {
        setLocalMuted(s.localParticipant.isMuted);
        setLocalCameraOn(s.localParticipant.isCameraOn);
        setLocalScreenSharing(s.localParticipant.isScreenSharing);
      }
    });

    // Fetch token and connect
    (async () => {
      try {
        const headers = await authorizedHeaders(user);
        const res = await fetch(`${API_URL}/api/huddle/join`, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ channelId }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
        }

        // Optimistically populate activeHuddles so the HuddleBar renders
        dispatch({
          type: "huddle/started",
          huddle: {
            channelId: channelId as ChannelId,
            participants: [{
              userId: user.id as UserId,
              isMuted: false,
              isCameraOn: false,
              isScreenSharing: false,
              joinedAt: new Date().toISOString(),
            }],
            startedAt: new Date().toISOString(),
            livekitRoom: null,
            screenShareUserId: null,
            messageId: null,
          },
        });

        const { token, wsUrl } = await res.json() as { token: string; wsUrl: string };

        // Connect to LiveKit — if it fails, keep the huddle UI visible (degraded mode)
        try {
          await client.connect(wsUrl, token);
        } catch (connectErr) {
          console.warn("LiveKit connection failed, running in degraded mode:", connectErr);
        }

        // Enable mic — if it fails (permission denied, no device, etc.), join muted
        try {
          await client.enableMicrophone();
        } catch (micErr) {
          console.warn("Microphone unavailable, joining muted:", micErr);
          setLocalMuted(true);
        }

        setError(null);
      } catch (err) {
        console.error("Failed to join huddle:", err);
        const message = err instanceof Error
          ? err.message
          : "Failed to join huddle";
        setError(message);
        // Leave the huddle since we can't even fetch the token
        dispatch({ type: "huddle/setCurrentChannel", channelId: null });
      }
    })();

    return () => {
      unsubscribe();
      client.destroy();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, user?.id]);

  const toggleMute = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    try {
      await client.toggleMicrophone();
    } catch (err) {
      const alert = classifyMediaError(err, "microphone");
      if (alert) setPermissionAlert(alert);
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    try {
      await client.toggleCamera();
    } catch (err) {
      const alert = classifyMediaError(err, "camera");
      if (alert) setPermissionAlert(alert);
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    const s = client.getState();
    const isSharing = s.localParticipant?.isScreenSharing ?? false;
    if (isSharing) {
      try {
        await client.stopScreenShare();
      } catch (err) {
        console.error("Failed to stop screen share:", err);
      }
    } else {
      try {
        await client.startScreenShare();
      } catch (err) {
        const alert = classifyMediaError(err, "screen");
        if (alert) setPermissionAlert(alert);
        // If alert is null, user just cancelled the picker — no action needed
      }
    }
  }, []);

  const switchAudioDevice = useCallback(async (deviceId: string) => {
    try {
      await clientRef.current?.switchAudioDevice(deviceId);
    } catch {
      setPermissionAlert({
        title: "Could not switch device",
        description: "The selected device is unavailable. Try a different one.",
      });
    }
  }, []);

  const switchVideoDevice = useCallback(async (deviceId: string) => {
    try {
      await clientRef.current?.switchVideoDevice(deviceId);
    } catch {
      setPermissionAlert({
        title: "Could not switch device",
        description: "The selected device is unavailable. Try a different one.",
      });
    }
  }, []);

  const dismissPermissionAlert = useCallback(() => {
    setPermissionAlert(null);
  }, []);

  // Use LiveKit state when available, fall back to local optimistic state
  const isMuted = mediaState?.localParticipant
    ? mediaState.localParticipant.isMuted
    : localMuted;
  const isCameraOn = mediaState?.localParticipant
    ? mediaState.localParticipant.isCameraOn
    : localCameraOn;
  const isScreenSharing = mediaState?.localParticipant
    ? mediaState.localParticipant.isScreenSharing
    : localScreenSharing;

  return {
    mediaState,
    error,
    isMuted,
    isCameraOn,
    isScreenSharing,
    permissionAlert,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    switchAudioDevice,
    switchVideoDevice,
    dismissPermissionAlert,
  };
}
