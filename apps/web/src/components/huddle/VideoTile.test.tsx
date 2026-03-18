import { describe, test, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "../../test-utils";
import type { ParticipantTrackInfo } from "@openslaq/huddle/client";

// Mock MediaStream so that `new MediaStream([track])` works in happy-dom
class MockMediaStream {
  tracks: unknown[];
  constructor(tracks?: unknown[]) {
    this.tracks = tracks ?? [];
  }
}
(globalThis as unknown as { MediaStream: unknown }).MediaStream = MockMediaStream;

// happy-dom's HTMLMediaElement rejects non-real MediaStream for srcObject.
// Override to accept our mock.
Object.defineProperty(HTMLVideoElement.prototype, "srcObject", {
  set(value: unknown) {
    (this as unknown as { _srcObject: unknown })._srcObject = value;
  },
  get() {
    return (this as unknown as { _srcObject: unknown })._srcObject ?? null;
  },
  configurable: true,
});

import { VideoTile } from "./VideoTile";

function makeParticipant(overrides?: Partial<ParticipantTrackInfo>): ParticipantTrackInfo {
  return {
    userId: "user-abc",
    isMuted: false,
    isSpeaking: false,
    isCameraOn: false,
    isScreenSharing: false,
    cameraTrack: null,
    screenTrack: null,
    ...overrides,
  } as ParticipantTrackInfo;
}

describe("VideoTile", () => {
  afterEach(cleanup);

  test("renders initials fallback when no camera track", () => {
    render(<VideoTile participant={makeParticipant()} />);
    const tile = screen.getByTestId("video-tile-user-abc");
    expect(tile.textContent).toContain("US");
    // No video element
    expect(tile.querySelector("video")).toBeNull();
  });

  test("renders video element when camera track exists", () => {
    const fakeTrack = {} as MediaStreamTrack;
    render(
      <VideoTile participant={makeParticipant({ cameraTrack: fakeTrack })} />,
    );
    const tile = screen.getByTestId("video-tile-user-abc");
    const video = tile.querySelector("video");
    expect(video).toBeTruthy();
    expect((video as HTMLVideoElement).srcObject).toBeInstanceOf(MockMediaStream);
  });

  test("shows (You) label when isLocal", () => {
    render(<VideoTile participant={makeParticipant()} isLocal />);
    const tile = screen.getByTestId("video-tile-user-abc");
    expect(tile.textContent).toContain("(You)");
  });

  test("does not show (You) label when not isLocal", () => {
    render(<VideoTile participant={makeParticipant()} />);
    const tile = screen.getByTestId("video-tile-user-abc");
    expect(tile.textContent).not.toContain("(You)");
  });

  test("shows muted icon when participant.isMuted", () => {
    render(<VideoTile participant={makeParticipant({ isMuted: true })} />);
    const tile = screen.getByTestId("video-tile-user-abc");
    // Muted icon has text-red-400 class
    const muteIcon = tile.querySelector(".text-red-400");
    expect(muteIcon).toBeTruthy();
  });

  test("does not show muted icon when not muted", () => {
    render(<VideoTile participant={makeParticipant({ isMuted: false })} />);
    const tile = screen.getByTestId("video-tile-user-abc");
    const muteIcon = tile.querySelector(".text-red-400");
    expect(muteIcon).toBeNull();
  });

  test("shows speaking ring when isSpeaking", () => {
    render(<VideoTile participant={makeParticipant({ isSpeaking: true })} />);
    const tile = screen.getByTestId("video-tile-user-abc");
    expect(tile.className).toContain("ring-blue-400/70");
  });

  test("cleans up MediaStream on unmount", () => {
    const fakeTrack = {} as MediaStreamTrack;
    const { unmount } = render(
      <VideoTile participant={makeParticipant({ cameraTrack: fakeTrack })} />,
    );

    const tile = screen.getByTestId("video-tile-user-abc");
    const video = tile.querySelector("video") as HTMLVideoElement;
    expect(video.srcObject).toBeInstanceOf(MockMediaStream);

    unmount();
    expect(video.srcObject).toBeNull();
  });
});
