import { describe, test, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "../../test-utils";
import type { ParticipantTrackInfo } from "@openslaq/huddle/client";

// Provide browser APIs needed by VideoTile in happy-dom
class MockMediaStream {
  tracks: unknown[];
  constructor(tracks?: unknown[]) { this.tracks = tracks ?? []; }
}
(globalThis as unknown as { MediaStream: unknown }).MediaStream = MockMediaStream;
Object.defineProperty(HTMLVideoElement.prototype, "srcObject", {
  set(value: unknown) { (this as unknown as { _srcObject: unknown })._srcObject = value; },
  get() { return (this as unknown as { _srcObject: unknown })._srcObject ?? null; },
  configurable: true,
});

import { VideoGrid } from "./VideoGrid";

function makeParticipant(userId: string, overrides?: Partial<ParticipantTrackInfo>): ParticipantTrackInfo {
  return {
    userId,
    isMuted: false,
    isSpeaking: false,
    isCameraOn: false,
    isScreenSharing: false,
    cameraTrack: null,
    screenTrack: null,
    ...overrides,
  } as ParticipantTrackInfo;
}

describe("VideoGrid", () => {
  afterEach(cleanup);

  test("gallery layout: 1 participant → grid-cols-1", () => {
    render(
      <VideoGrid localParticipant={makeParticipant("local-1")} remoteParticipants={[]} />,
    );
    const grid = screen.getByTestId("video-grid");
    expect(grid.className).toContain("grid-cols-1");
  });

  test("gallery layout: 2 participants → grid-cols-2", () => {
    render(
      <VideoGrid
        localParticipant={makeParticipant("local-1")}
        remoteParticipants={[makeParticipant("remote-1")]}
      />,
    );
    const grid = screen.getByTestId("video-grid");
    expect(grid.className).toContain("grid-cols-2");
  });

  test("gallery layout: 4 participants → grid-cols-2 grid-rows-2", () => {
    render(
      <VideoGrid
        localParticipant={makeParticipant("local-1")}
        remoteParticipants={[
          makeParticipant("remote-1"),
          makeParticipant("remote-2"),
          makeParticipant("remote-3"),
        ]}
      />,
    );
    const grid = screen.getByTestId("video-grid");
    expect(grid.className).toContain("grid-cols-2");
    expect(grid.className).toContain("grid-rows-2");
  });

  test("empty participants: renders empty grid", () => {
    render(<VideoGrid localParticipant={null} remoteParticipants={[]} />);
    const grid = screen.getByTestId("video-grid");
    expect(grid.children.length).toBe(0);
  });

  test("local + remote participants both rendered", () => {
    render(
      <VideoGrid
        localParticipant={makeParticipant("local-1")}
        remoteParticipants={[makeParticipant("remote-1")]}
      />,
    );
    const grid = screen.getByTestId("video-grid");
    // Both participants should be rendered (2 children)
    expect(grid.children.length).toBe(2);
  });

  test("screen share layout: renders main area + thumbnail strip", () => {
    const screenSharer = makeParticipant("remote-1", {
      isScreenSharing: true,
      screenTrack: {} as MediaStreamTrack,
    });

    render(
      <VideoGrid
        localParticipant={makeParticipant("local-1")}
        remoteParticipants={[screenSharer]}
      />,
    );

    const grid = screen.getByTestId("video-grid");
    // Screen share layout uses flex, not grid
    expect(grid.className).toContain("flex");
    expect(grid.className).not.toContain("grid-cols");
  });

  test("gallery layout: 6 participants → grid-cols-3 grid-rows-2", () => {
    render(
      <VideoGrid
        localParticipant={makeParticipant("local-1")}
        remoteParticipants={[
          makeParticipant("r-1"),
          makeParticipant("r-2"),
          makeParticipant("r-3"),
          makeParticipant("r-4"),
          makeParticipant("r-5"),
        ]}
      />,
    );
    const grid = screen.getByTestId("video-grid");
    expect(grid.className).toContain("grid-cols-3");
    expect(grid.className).toContain("grid-rows-2");
  });
});
