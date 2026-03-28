import type { Room, RemoteParticipant, RemoteTrackPublication } from "livekit-client";
import { ConnectionState, Track } from "livekit-client";
import { asUserId, type UserId } from "@openslaq/shared";
import type { HuddleParticipantInfo } from "./HuddleProvider";

export interface ParticipantSnapshot {
  participants: HuddleParticipantInfo[];
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  screenShareUserId: UserId | null;
}

/**
 * Reads the current state of a LiveKit Room and builds a snapshot of all
 * participants with their audio/video/screen-share status. This is a pure
 * read of the room object — it has no side effects.
 *
 * Returns null if the room is not in a connected state.
 */
export function buildParticipantSnapshot(room: Room): ParticipantSnapshot | null {
  if (room.state !== ConnectionState.Connected) return null;

  const infos: HuddleParticipantInfo[] = [];
  let screenShareUserId: UserId | null = null;
  let localMuted = false;
  let localCamera = false;
  let localScreenSharing = false;

  // Local participant
  const local = room.localParticipant;
  if (local) {
    const isScreenShare = local.isScreenShareEnabled;
    localMuted = !local.isMicrophoneEnabled;
    localCamera = local.isCameraEnabled;
    localScreenSharing = isScreenShare;

    infos.push({
      userId: asUserId(local.identity),
      isMuted: localMuted,
      isCameraOn: localCamera,
      isScreenSharing: isScreenShare,
    });
    if (isScreenShare) {
      screenShareUserId = asUserId(local.identity);
    }
  }

  // Remote participants
  for (const p of room.remoteParticipants.values()) {
    const remote = readRemoteParticipant(p);
    if (remote.isScreenSharing) {
      screenShareUserId = asUserId(p.identity);
    }
    infos.push({
      userId: asUserId(p.identity),
      ...remote,
    });
  }

  return {
    participants: infos,
    isMuted: localMuted,
    isCameraOn: localCamera,
    isScreenSharing: localScreenSharing,
    screenShareUserId,
  };
}

function readRemoteParticipant(
  p: RemoteParticipant,
): Omit<HuddleParticipantInfo, "userId"> {
  let muted = true;
  let camera = false;
  let screenSharing = false;

  for (const pub of p.trackPublications.values()) {
    const rtp = pub as RemoteTrackPublication;
    if (rtp.source === Track.Source.Microphone) {
      muted = rtp.isMuted;
    } else if (rtp.source === Track.Source.Camera) {
      camera = !rtp.isMuted && !!rtp.track;
    } else if (rtp.source === Track.Source.ScreenShare) {
      screenSharing = !rtp.isMuted && !!rtp.track;
    }
  }

  return { isMuted: muted, isCameraOn: camera, isScreenSharing: screenSharing };
}
