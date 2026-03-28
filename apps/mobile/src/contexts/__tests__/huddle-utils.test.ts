import { buildParticipantSnapshot } from "../huddle-utils";
import { ConnectionState, Track } from "livekit-client";
import type { Room } from "livekit-client";

jest.mock("livekit-client", () => ({
  ConnectionState: { Connected: "connected", Disconnected: "disconnected" },
  Track: {
    Source: {
      Microphone: "microphone",
      Camera: "camera",
      ScreenShare: "screen_share",
    },
  },
}));

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    state: ConnectionState.Connected,
    localParticipant: {
      identity: "user-1",
      isMicrophoneEnabled: true,
      isCameraEnabled: false,
      isScreenShareEnabled: false,
    },
    remoteParticipants: new Map(),
    ...overrides,
  } as unknown as Room;
}

function makeRemoteParticipant(
  identity: string,
  tracks: Array<{ source: string; isMuted: boolean; track: unknown }>,
) {
  const publications = new Map(
    tracks.map((t, i) => [`track-${i}`, t]),
  );
  return { identity, trackPublications: publications };
}

describe("buildParticipantSnapshot", () => {
  it("returns null when room is not connected", () => {
    const room = makeRoom({ state: "disconnected" as ConnectionState });
    expect(buildParticipantSnapshot(room)).toBeNull();
  });

  it("reads local participant state", () => {
    const room = makeRoom({
      localParticipant: {
        identity: "user-1",
        isMicrophoneEnabled: false,
        isCameraEnabled: true,
        isScreenShareEnabled: false,
      } as any,
    });

    const snapshot = buildParticipantSnapshot(room)!;
    expect(snapshot.participants).toHaveLength(1);
    expect(snapshot.participants[0]).toEqual({
      userId: "user-1",
      isMuted: true,
      isCameraOn: true,
      isScreenSharing: false,
    });
    expect(snapshot.isMuted).toBe(true);
    expect(snapshot.isCameraOn).toBe(true);
    expect(snapshot.isScreenSharing).toBe(false);
    expect(snapshot.screenShareUserId).toBeNull();
  });

  it("detects local screen sharing", () => {
    const room = makeRoom({
      localParticipant: {
        identity: "user-1",
        isMicrophoneEnabled: true,
        isCameraEnabled: false,
        isScreenShareEnabled: true,
      } as any,
    });

    const snapshot = buildParticipantSnapshot(room)!;
    expect(snapshot.isScreenSharing).toBe(true);
    expect(snapshot.screenShareUserId).toBe("user-1");
  });

  it("includes remote participants", () => {
    const remote = makeRemoteParticipant("user-2", [
      { source: Track.Source.Microphone, isMuted: false, track: {} },
      { source: Track.Source.Camera, isMuted: false, track: {} },
    ]);

    const room = makeRoom({
      remoteParticipants: new Map([["user-2", remote]]) as any,
    });

    const snapshot = buildParticipantSnapshot(room)!;
    expect(snapshot.participants).toHaveLength(2);

    const remoteP = snapshot.participants.find((p) => p.userId === "user-2")!;
    expect(remoteP.isMuted).toBe(false);
    expect(remoteP.isCameraOn).toBe(true);
    expect(remoteP.isScreenSharing).toBe(false);
  });

  it("detects remote screen sharing", () => {
    const remote = makeRemoteParticipant("user-2", [
      { source: Track.Source.Microphone, isMuted: true, track: {} },
      { source: Track.Source.ScreenShare, isMuted: false, track: {} },
    ]);

    const room = makeRoom({
      remoteParticipants: new Map([["user-2", remote]]) as any,
    });

    const snapshot = buildParticipantSnapshot(room)!;
    expect(snapshot.screenShareUserId).toBe("user-2");
    const remoteP = snapshot.participants.find((p) => p.userId === "user-2")!;
    expect(remoteP.isScreenSharing).toBe(true);
  });

  it("camera is off when track is null", () => {
    const remote = makeRemoteParticipant("user-2", [
      { source: Track.Source.Camera, isMuted: false, track: null },
    ]);

    const room = makeRoom({
      remoteParticipants: new Map([["user-2", remote]]) as any,
    });

    const snapshot = buildParticipantSnapshot(room)!;
    const remoteP = snapshot.participants.find((p) => p.userId === "user-2")!;
    expect(remoteP.isCameraOn).toBe(false);
  });

  it("handles multiple remote participants", () => {
    const remote1 = makeRemoteParticipant("user-2", [
      { source: Track.Source.Microphone, isMuted: true, track: {} },
    ]);
    const remote2 = makeRemoteParticipant("user-3", [
      { source: Track.Source.Microphone, isMuted: false, track: {} },
    ]);

    const room = makeRoom({
      remoteParticipants: new Map([
        ["user-2", remote1],
        ["user-3", remote2],
      ]) as any,
    });

    const snapshot = buildParticipantSnapshot(room)!;
    expect(snapshot.participants).toHaveLength(3);
    expect(snapshot.participants.map((p) => p.userId)).toEqual(["user-1", "user-2", "user-3"]);
  });
});
