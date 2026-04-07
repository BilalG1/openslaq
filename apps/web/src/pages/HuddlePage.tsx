import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  useConnectionState,
  useRoomContext,
  useTracks,
  useIsSpeaking,
} from "@livekit/components-react";
import { Track, ConnectionState, VideoPresets, type RoomOptions, type Participant } from "livekit-client";
import { notifyHuddleLeave } from "@openslaq/client-core";
import * as Sentry from "@sentry/react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useAuthProvider } from "../lib/api-client";
import { api } from "../api";
import { useHuddleToken } from "../hooks/chat/useHuddleToken";
import { VideoGrid } from "../components/huddle/VideoGrid";
import { DeviceSelector } from "../components/huddle/DeviceSelector";
import { classifyMediaError, type PermissionAlert } from "../lib/huddle-errors";
import type { HuddleParticipant } from "../components/huddle/VideoTile";
import { Radio, VolumeX, Mic, Video, VideoOff, Monitor, PhoneOff } from "lucide-react";
import { Tooltip } from "../components/ui";
import { isTauri } from "../lib/tauri";

function closeWindow() {
  if (isTauri()) {
    import("@tauri-apps/api/webviewWindow").then(({ getCurrentWebviewWindow }) => {
      getCurrentWebviewWindow().close();
    });
  } else {
    window.close();
  }
}

const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: {
    resolution: VideoPresets.h720.resolution,
  },
  publishDefaults: {
    videoEncoding: VideoPresets.h720.encoding,
    screenShareEncoding: VideoPresets.h1080.encoding,
  },
};

function toHuddleParticipant(p: Participant, isSpeaking: boolean): HuddleParticipant {
  let isMuted = true;
  for (const pub of p.trackPublications.values()) {
    if (pub.source === Track.Source.Microphone) {
      isMuted = pub.isMuted;
      break;
    }
  }
  return {
    identity: p.identity,
    name: p.name || p.identity,
    isMuted,
    isSpeaking,
  };
}

export function HuddlePage() {
  const { channelId } = useParams<{ channelId: string }>();
  const user = useCurrentUser();
  const channelName = new URLSearchParams(window.location.search).get("name") ?? "Huddle";

  const { token, wsUrl, error: tokenError } = useHuddleToken(channelId, user);
  const [connectError, setConnectError] = useState<string | null>(null);

  const error = tokenError ?? connectError;

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => closeWindow()}
            className="px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 text-white border-none cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={wsUrl ?? undefined}
      token={token ?? undefined}
      connect={!!token && !!wsUrl}
      options={ROOM_OPTIONS}
      onError={(err) => {
        Sentry.captureException(err);
        setConnectError(`Could not connect to voice server (${err.message})`);
      }}
      // Render as a plain div wrapper
      data-lk-theme="default"
      style={{ height: "100vh" }}
    >
      <RoomAudioRenderer />
      <HuddlePageContent channelName={channelName} />
    </LiveKitRoom>
  );
}

function HuddlePageContent({ channelName }: { channelName: string }) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const trackRefs = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
  const localIsSpeaking = useIsSpeaking(localParticipant);

  const [permissionAlert, setPermissionAlert] = useState<PermissionAlert | null>(null);
  const [micInitialized, setMicInitialized] = useState(false);

  const connected = connectionState === ConnectionState.Connected;

  const auth = useAuthProvider();
  const apiDeps = useMemo(() => ({ api, auth }), [auth]);

  // Auto-enable mic on first connect — if permission denied, join muted
  useEffect(() => {
    if (!connected || micInitialized) return;
    setMicInitialized(true);
    localParticipant.setMicrophoneEnabled(true).catch((err) => {
      console.warn("Microphone unavailable, joining muted:", err);
    });
  }, [connected, micInitialized, localParticipant]);

  const handleLeave = useCallback(() => {
    room.disconnect();
    notifyHuddleLeave(apiDeps);
    closeWindow();
  }, [room, apiDeps]);

  const toggleMute = useCallback(async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (err) {
      const alert = classifyMediaError(err, "microphone");
      if (alert) setPermissionAlert(alert);
    }
  }, [localParticipant, isMicrophoneEnabled]);

  const toggleCamera = useCallback(async () => {
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (err) {
      const alert = classifyMediaError(err, "camera");
      if (alert) setPermissionAlert(alert);
    }
  }, [localParticipant, isCameraEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenShareEnabled) {
      try {
        await localParticipant.setScreenShareEnabled(false);
      } catch (err) {
        Sentry.captureException(err);
        console.error("Failed to stop screen share:", err);
      }
    } else {
      try {
        await localParticipant.setScreenShareEnabled(true);
      } catch (err) {
        const alert = classifyMediaError(err, "screen");
        if (alert) setPermissionAlert(alert);
      }
    }
  }, [localParticipant, isScreenShareEnabled]);

  const switchAudioDevice = useCallback(async (deviceId: string) => {
    try {
      await room.switchActiveDevice("audioinput", deviceId);
    } catch {
      setPermissionAlert({
        title: "Could not switch device",
        description: "The selected device is unavailable. Try a different one.",
      });
    }
  }, [room]);

  // beforeunload cleanup
  useEffect(() => {
    const handler = () => {
      room.disconnect();
      notifyHuddleLeave(apiDeps);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [room, apiDeps]);

  // Build participant list for VideoGrid
  const participants = useMemo(() => {
    const entries = [];
    if (connected) {
      entries.push({
        participant: toHuddleParticipant(localParticipant, localIsSpeaking),
        isLocal: true,
      });
    }
    for (const rp of remoteParticipants) {
      entries.push({
        participant: toHuddleParticipant(rp, rp.isSpeaking),
        isLocal: false,
      });
    }
    return entries;
  }, [connected, localParticipant, localIsSpeaking, remoteParticipants]);

  const participantCount = participants.length;
  const isMuted = !isMicrophoneEnabled;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white relative">
      {/* Permission alert overlay */}
      {permissionAlert && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm mx-4 shadow-2xl" data-testid="permission-alert">
            <h3 className="text-base font-semibold mb-2">{permissionAlert.title}</h3>
            <p className="text-sm text-white/60 mb-5">{permissionAlert.description}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPermissionAlert(null)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm font-medium border-none cursor-pointer"
                data-testid="permission-alert-ok"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header badge */}
      <div className="shrink-0 px-4 py-2">
        <div className="inline-flex items-center gap-2 backdrop-blur-md bg-white/10 rounded-full px-3 py-1.5 border border-white/10" data-testid="huddle-badge">
          <Radio className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium">{channelName}</span>
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          {connected && (
            <span className="text-xs text-white/50 ml-1">
              {participantCount} participant{participantCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 min-h-0">
        {connected ? (
          <VideoGrid participants={participants} trackRefs={trackRefs} />
        ) : (
          <div className="flex items-center justify-center h-full text-white/40 text-sm">
            Connecting...
          </div>
        )}
      </div>

      {/* Floating control bar */}
      <div className="flex items-center justify-center pb-4 px-4">
        <div className="flex items-center gap-2 backdrop-blur-xl bg-white/10 border border-white/10 rounded-full px-4 py-2.5 shadow-xl">
          <Tooltip content={isMuted ? "Unmute" : "Mute"}>
            <button
              type="button"
              onClick={toggleMute}
              className={`p-2 rounded-full transition-colors ${isMuted ? "bg-red-500/80 hover:bg-red-500" : "bg-white/10 hover:bg-white/20"}`}
              data-testid="huddle-mute-toggle"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          </Tooltip>

          <Tooltip content={isCameraEnabled ? "Turn off camera" : "Turn on camera"}>
            <button
              type="button"
              onClick={toggleCamera}
              className={`p-2 rounded-full transition-colors ${!isCameraEnabled ? "bg-red-500/80 hover:bg-red-500" : "bg-white/10 hover:bg-white/20"}`}
              data-testid="huddle-camera-toggle"
            >
              {isCameraEnabled ? (
                <Video className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </button>
          </Tooltip>

          <Tooltip content={isScreenShareEnabled ? "Stop sharing" : "Share screen"}>
            <button
              type="button"
              onClick={toggleScreenShare}
              className={`p-2 rounded-full transition-colors ${isScreenShareEnabled ? "bg-blue-500/80 hover:bg-blue-500" : "bg-white/10 hover:bg-white/20"}`}
              data-testid="huddle-screenshare-toggle"
            >
              <Monitor className="w-5 h-5" />
            </button>
          </Tooltip>

          <DeviceSelector onSelectDevice={switchAudioDevice} />

          <div className="w-px h-6 bg-white/20 mx-1" />

          <Tooltip content="Leave huddle">
            <button
              type="button"
              onClick={handleLeave}
              className="p-2 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors"
              data-testid="huddle-leave"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
