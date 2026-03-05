import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { HuddleClient, type HuddleMediaState } from "@openslaq/huddle/client";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { authorizedHeaders } from "../lib/api-client";
import { env } from "../env";
import { VideoGrid } from "../components/huddle/VideoGrid";
import { DeviceSelector } from "../components/huddle/DeviceSelector";
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
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 text-white border-none cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 8.464a5 5 0 000 7.072M17.657 6.343a8 8 0 010 11.314M6.343 6.343a8 8 0 000 11.314" />
          </svg>
          <span className="text-sm font-medium">{channelName}</span>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>
        {mediaState && (
          <span className="text-xs text-gray-400">
            {(mediaState.participants.length + (mediaState.localParticipant ? 1 : 0))} participant{(mediaState.participants.length + (mediaState.localParticipant ? 1 : 0)) !== 1 ? "s" : ""}
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
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Connecting...
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-700 bg-gray-800">
        <DeviceSelector onSelectDevice={switchAudioDevice} />

        <Tooltip content={isMuted ? "Unmute" : "Mute"}>
          <button
            type="button"
            onClick={toggleMute}
            className={`p-2.5 rounded-full border-none cursor-pointer ${
              isMuted ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
            }`}
            data-testid="huddle-mute-toggle"
          >
            {isMuted ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        </Tooltip>

        <Tooltip content={isCameraOn ? "Turn off camera" : "Turn on camera"}>
          <button
            type="button"
            onClick={toggleCamera}
            className={`p-2.5 rounded-full border-none cursor-pointer ${
              isCameraOn ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
            }`}
            data-testid="huddle-camera-toggle"
          >
            {isCameraOn ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </Tooltip>

        <Tooltip content={isScreenSharing ? "Stop sharing" : "Share screen"}>
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`p-2.5 rounded-full border-none cursor-pointer ${
              isScreenSharing ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
            }`}
            data-testid="huddle-screenshare-toggle"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        </Tooltip>

        <Tooltip content="Leave huddle">
          <button
            type="button"
            onClick={handleLeave}
            className="p-2.5 rounded-full bg-red-600 text-white hover:bg-red-700 border-none cursor-pointer"
            data-testid="huddle-leave"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
