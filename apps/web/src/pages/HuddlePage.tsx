import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { HuddleClient, type HuddleMediaState } from "@openslaq/huddle/client";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { authorizedHeaders } from "../lib/api-client";
import { env } from "../env";
import { VideoGrid } from "../components/huddle/VideoGrid";
import { DeviceSelector } from "../components/huddle/DeviceSelector";
import { Radio, VolumeX, Mic, Video, VideoOff, Monitor, PhoneOff } from "lucide-react";
import { Tooltip } from "../components/ui";

const API_URL = env.VITE_API_URL;

export function HuddlePage() {
  const { channelId } = useParams<{ channelId: string }>();
  const user = useCurrentUser();
  const clientRef = useRef<HuddleClient | null>(null);
  const [mediaState, setMediaState] = useState<HuddleMediaState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const channelName = new URLSearchParams(window.location.search).get("name") ?? channelId ?? "Huddle";

  useEffect(() => {
    if (!channelId || !user) return;

    const client = new HuddleClient();
    clientRef.current = client;

    const unsubscribe = client.subscribe((s) => {
      setMediaState(s);
      if (s.localParticipant) {
        setIsMuted(s.localParticipant.isMuted);
        setIsCameraOn(s.localParticipant.isCameraOn);
        setIsScreenSharing(s.localParticipant.isScreenSharing);
      }
    });

    const abortController = new AbortController();

    (async () => {
      try {
        const headers = await authorizedHeaders(user);
        const res = await fetch(`${API_URL}/api/huddle/join`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ channelId }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
        }

        const { token, wsUrl } = (await res.json()) as { token: string; wsUrl: string };

        try {
          await client.connect(wsUrl, token);
          await client.enableMicrophone();
        } catch (connectErr) {
          console.warn("LiveKit connection failed, running in degraded mode:", connectErr);
        }
        setError(null);
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.error("Failed to join huddle:", err);
        setError(err instanceof Error ? err.message : "Failed to join huddle");
      }
    })();

    return () => {
      abortController.abort();
      unsubscribe();
      client.destroy();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, [channelId, user?.id]);

  const handleLeave = useCallback(() => {
    clientRef.current?.destroy();
    clientRef.current = null;
    window.close();
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    clientRef.current?.toggleMicrophone().catch(console.error);
  }, []);

  const toggleCamera = useCallback(() => {
    setIsCameraOn((prev) => !prev);
    clientRef.current?.toggleCamera().catch(console.error);
  }, []);

  const toggleScreenShare = useCallback(() => {
    setIsScreenSharing((prev) => !prev);
    const client = clientRef.current;
    if (!client) return;
    const s = client.getState();
    const sharing = s.localParticipant?.isScreenSharing ?? false;
    if (sharing) {
      client.stopScreenShare().catch(console.error);
    } else {
      client.startScreenShare().catch(console.error);
    }
  }, []);

  const switchAudioDevice = useCallback((deviceId: string) => {
    clientRef.current?.switchAudioDevice(deviceId).catch(console.error);
  }, []);

  // beforeunload to disconnect
  useEffect(() => {
    const handler = () => {
      clientRef.current?.destroy();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.close()}
            className="px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 text-white border-none cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const participantCount = (mediaState?.participants.length ?? 0) + (mediaState?.localParticipant ? 1 : 0);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white relative">
      {/* Floating header badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 backdrop-blur-md bg-white/10 rounded-full px-3 py-1.5 border border-white/10">
        <Radio className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium">{channelName}</span>
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        {mediaState && (
          <span className="text-xs text-white/50 ml-1">
            {participantCount} participant{participantCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Video grid */}
      <div className="flex-1 min-h-0">
        {mediaState ? (
          <VideoGrid
            localParticipant={mediaState.localParticipant}
            remoteParticipants={mediaState.participants}
          />
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

          <Tooltip content={isCameraOn ? "Turn off camera" : "Turn on camera"}>
            <button
              type="button"
              onClick={toggleCamera}
              className={`p-2 rounded-full transition-colors ${!isCameraOn ? "bg-red-500/80 hover:bg-red-500" : "bg-white/10 hover:bg-white/20"}`}
              data-testid="huddle-camera-toggle"
            >
              {isCameraOn ? (
                <Video className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </button>
          </Tooltip>

          <Tooltip content={isScreenSharing ? "Stop sharing" : "Share screen"}>
            <button
              type="button"
              onClick={toggleScreenShare}
              className={`p-2 rounded-full transition-colors ${isScreenSharing ? "bg-blue-500/80 hover:bg-blue-500" : "bg-white/10 hover:bg-white/20"}`}
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
