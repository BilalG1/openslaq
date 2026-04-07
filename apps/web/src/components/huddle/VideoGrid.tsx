import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Track } from "livekit-client";
import { VideoTile, type HuddleParticipant } from "./VideoTile";

interface ParticipantEntry {
  participant: HuddleParticipant;
  isLocal: boolean;
  /** Camera or screen share track for this participant, if any. */
  trackRef?: TrackReferenceOrPlaceholder;
}

interface VideoGridProps {
  participants: ParticipantEntry[];
  trackRefs: TrackReferenceOrPlaceholder[];
}

function getGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 2) return "grid-cols-2";
  if (count <= 4) return "grid-cols-2 grid-rows-2";
  if (count <= 6) return "grid-cols-3 grid-rows-2";
  if (count <= 9) return "grid-cols-3 grid-rows-3";
  return "grid-cols-4 grid-rows-3";
}

function findTrackRef(
  trackRefs: TrackReferenceOrPlaceholder[],
  identity: string,
  source: Track.Source,
): TrackReferenceOrPlaceholder | undefined {
  return trackRefs.find(
    (t) => t.participant.identity === identity && t.source === source,
  );
}

export function VideoGrid({ participants, trackRefs }: VideoGridProps) {
  // Find screen share participant
  const screenSharer = participants.find(
    (p) => findTrackRef(trackRefs, p.participant.identity, Track.Source.ScreenShare),
  );

  // Presentation layout: screen share takes main area
  if (screenSharer) {
    const screenTrackRef = findTrackRef(
      trackRefs,
      screenSharer.participant.identity,
      Track.Source.ScreenShare,
    );
    const thumbnails = participants.filter(
      (p) => p.participant.identity !== screenSharer.participant.identity || !screenTrackRef,
    );

    return (
      <div className="flex h-full gap-3 p-3" data-testid="video-grid">
        {/* Main screen share area */}
        <div className="flex-1 min-w-0">
          <VideoTile
            participant={screenSharer.participant}
            trackRef={screenTrackRef}
            isLocal={screenSharer.isLocal}
          />
        </div>
        {/* Thumbnail strip */}
        {thumbnails.length > 0 && (
          <div className="w-48 flex flex-col gap-3 overflow-y-auto">
            {thumbnails.map((p) => (
              <div key={p.participant.identity} className="aspect-video">
                <VideoTile
                  participant={p.participant}
                  trackRef={findTrackRef(trackRefs, p.participant.identity, Track.Source.Camera)}
                  isLocal={p.isLocal}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Gallery layout
  const gridClass = getGridClass(participants.length);

  return (
    <div className={`grid gap-3 p-3 h-full ${gridClass}`} data-testid="video-grid">
      {participants.map((p) => (
        <VideoTile
          key={p.participant.identity}
          participant={p.participant}
          trackRef={findTrackRef(trackRefs, p.participant.identity, Track.Source.Camera)}
          isLocal={p.isLocal}
        />
      ))}
    </div>
  );
}
