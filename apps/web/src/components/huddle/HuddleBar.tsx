import { useState } from "react";
import type { HuddleState, Channel } from "@openslaq/shared";
import { Headphones } from "lucide-react";
import type { HuddleMediaState } from "@openslaq/huddle/client";
import { Tooltip } from "../ui";
import { DeviceSelector } from "./DeviceSelector";
import { VideoGrid } from "./VideoGrid";

interface HuddleBarDm {
  channel: { id: string };
  otherUser: { displayName: string };
}

interface HuddleBarProps {
  huddle: HuddleState;
  channels: Channel[];
  dms: HuddleBarDm[];
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  onSwitchDevice?: (deviceId: string) => void;
  mediaState: HuddleMediaState | null;
}

export function HuddleBar({
  huddle,
  channels,
  dms,
  isMuted,
  isCameraOn,
  isScreenSharing,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
  onSwitchDevice,
  mediaState,
}: HuddleBarProps) {
  const [expanded, setExpanded] = useState(false);
  const channel = channels.find((c) => c.id === huddle.channelId);
  const dm = dms.find((d) => d.channel.id === huddle.channelId);
  const label = channel ? `# ${channel.name}` : dm ? dm.otherUser.displayName : "Huddle";

  return (
    <div className="border-t border-gray-800 bg-gray-800" data-testid="huddle-bar">
      {/* Expanded video grid */}
      {expanded && mediaState && (
        <div className="h-64 border-b border-gray-700">
          <VideoGrid
            localParticipant={mediaState.localParticipant}
            remoteParticipants={mediaState.participants}
          />
        </div>
      )}

      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="flex items-center gap-1 bg-transparent border-none cursor-pointer p-0"
            >
              <Headphones className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-green-400 text-xs font-medium">Huddle</span>
            </button>
            <span className="text-gray-300 text-xs truncate">{label}</span>
            <div className="flex -space-x-1">
              {huddle.participants.map((p) => (
                <div
                  key={p.userId}
                  className="w-5 h-5 rounded-full bg-gray-600 border-2 border-gray-800 flex items-center justify-center text-[9px] text-gray-300"
                  title={p.userId}
                >
                  {p.userId.slice(0, 1).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onSwitchDevice && <DeviceSelector onSelectDevice={onSwitchDevice} />}

            {/* Camera toggle */}
            <Tooltip content={isCameraOn ? "Turn off camera" : "Turn on camera"}>
              <button
                type="button"
                onClick={onToggleCamera}
                className={`p-1.5 rounded hover:bg-gray-700 bg-transparent border-none cursor-pointer ${
                  isCameraOn ? "text-white" : "text-gray-300 hover:text-white"
                }`}
                data-testid="huddle-camera-toggle"
              >
                {isCameraOn ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </Tooltip>

            {/* Mute toggle */}
            <Tooltip content={isMuted ? "Unmute" : "Mute"}>
              <button
                type="button"
                onClick={onToggleMute}
                className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white bg-transparent border-none cursor-pointer"
                data-testid="huddle-mute-toggle"
              >
              {isMuted ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
            </Tooltip>

            {/* Screen share toggle */}
            <Tooltip content={isScreenSharing ? "Stop sharing" : "Share screen"}>
              <button
                type="button"
                onClick={onToggleScreenShare}
                className={`p-1.5 rounded hover:bg-gray-700 bg-transparent border-none cursor-pointer ${
                  isScreenSharing ? "text-green-400" : "text-gray-300 hover:text-white"
                }`}
                data-testid="huddle-screenshare-toggle"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
            </Tooltip>

            {/* Leave button */}
            <Tooltip content="Leave huddle">
              <button
                type="button"
                onClick={onLeave}
                className="p-1.5 rounded hover:bg-red-600/30 text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer"
                data-testid="huddle-leave"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
