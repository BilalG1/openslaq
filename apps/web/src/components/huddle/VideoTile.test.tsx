import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
import type { HuddleParticipant } from "./VideoTile";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";

vi.mock("@livekit/components-react", () => ({
  VideoTrack: ({ className, muted }: { trackRef: unknown; className: string; muted?: boolean }) => (
    <video data-testid="lk-video-track" className={className} muted={muted ?? false} />
  ),
  isTrackReference: (ref: unknown) => ref !== null && typeof ref === "object" && "publication" in (ref as Record<string, unknown>),
}));

import { VideoTile } from "./VideoTile";

function makeParticipant(overrides?: Partial<HuddleParticipant>): HuddleParticipant {
  return {
    identity: "user-abc",
    name: "Alice Park",
    isMuted: false,
    isSpeaking: false,
    ...overrides,
  };
}

function makeTrackRef() {
  return {
    participant: { identity: "user-abc" },
    source: "camera",
    publication: {},
  } as unknown;
}

describe("VideoTile", () => {
  afterEach(cleanup);

  test("renders initials fallback when no track ref", () => {
    render(<VideoTile participant={makeParticipant()} />);
    const tile = screen.getByTestId("video-tile-user-abc");
    expect(tile.textContent).toContain("AL");
    expect(tile.querySelector("[data-testid='lk-video-track']")).toBeNull();
  });

  test("shows displayName instead of identity", () => {
    render(<VideoTile participant={makeParticipant()} />);
    const tile = screen.getByTestId("video-tile-user-abc");
    expect(tile.textContent).toContain("Alice Park");
    expect(tile.textContent).not.toContain("user-abc");
  });

  test("renders VideoTrack when track ref exists", () => {
    render(
      <VideoTile participant={makeParticipant()} trackRef={makeTrackRef() as TrackReferenceOrPlaceholder} />,
    );
    const tile = screen.getByTestId("video-tile-user-abc");
    expect(tile.querySelector("[data-testid='lk-video-track']")).toBeTruthy();
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
});
