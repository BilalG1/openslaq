import type { ParticipantTrackInfo } from "@openslaq/huddle/client";
import { VideoTile } from "./VideoTile";

interface VideoGridProps {
  localParticipant: ParticipantTrackInfo | null;
  remoteParticipants: ParticipantTrackInfo[];
}

function getGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 2) return "grid-cols-2";
  if (count <= 4) return "grid-cols-2 grid-rows-2";
  if (count <= 6) return "grid-cols-3 grid-rows-2";
  if (count <= 9) return "grid-cols-3 grid-rows-3";
  return "grid-cols-4 grid-rows-3";
}

export function VideoGrid({ localParticipant, remoteParticipants }: VideoGridProps) {
  // Find screen share participant
  const screenSharer = [
    ...(localParticipant ? [{ ...localParticipant, isLocal: true }] : []),
    ...remoteParticipants.map((p) => ({ ...p, isLocal: false })),
  ].find((p) => p.isScreenSharing);

  const allParticipants = [
    ...(localParticipant ? [{ info: localParticipant, isLocal: true }] : []),
    ...remoteParticipants.map((p) => ({ info: p, isLocal: false })),
  ];

  // Presentation layout: screen share takes main area
  if (screenSharer) {
    const thumbnails = allParticipants.filter(
      (p) => !(p.info.userId === screenSharer.userId && p.info.isScreenSharing),
    );

    return (
      <div className="flex h-full gap-3 p-3" data-testid="video-grid">
        {/* Main screen share area */}
        <div className="flex-1 min-w-0">
          <VideoTile
            participant={{
              ...screenSharer,
              // Show screen track as the main video
              cameraTrack: screenSharer.screenTrack,
              screenTrack: null,
            }}
            isLocal={screenSharer.isLocal}
          />
        </div>
        {/* Thumbnail strip */}
        {thumbnails.length > 0 && (
          <div className="w-48 flex flex-col gap-3 overflow-y-auto">
            {thumbnails.map((p) => (
              <div key={p.info.userId} className="aspect-video">
                <VideoTile participant={p.info} isLocal={p.isLocal} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Gallery layout
  const totalCount = allParticipants.length;
  const gridClass = getGridClass(totalCount);

  return (
    <div className={`grid gap-3 p-3 h-full ${gridClass}`} data-testid="video-grid">
      {allParticipants.map((p) => (
        <VideoTile key={p.info.userId} participant={p.info} isLocal={p.isLocal} />
      ))}
    </div>
  );
}
