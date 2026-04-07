import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
import type { HuddleParticipant } from "./VideoTile";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Track } from "livekit-client";

vi.mock("@livekit/components-react", () => ({
  VideoTrack: ({ className }: { className: string }) => (
    <video data-testid="lk-video-track" className={className} />
  ),
  isTrackReference: (ref: unknown) =>
    ref !== null && typeof ref === "object" && "publication" in (ref as Record<string, unknown>),
}));

vi.mock("livekit-client", () => ({
  Track: { Source: { Camera: "camera", ScreenShare: "screen_share" } },
}));

import { VideoGrid } from "./VideoGrid";

function makeParticipant(identity: string, overrides?: Partial<HuddleParticipant>): HuddleParticipant {
  return {
    identity,
    name: identity,
    isMuted: false,
    isSpeaking: false,
    ...overrides,
  };
}

function makeEntry(identity: string, isLocal = false) {
  return { participant: makeParticipant(identity), isLocal };
}

function makeTrackRef(identity: string, source: string) {
  return {
    participant: { identity },
    source,
    publication: {},
  };
}

describe("VideoGrid", () => {
  afterEach(cleanup);

  test("gallery layout: 1 participant → grid-cols-1", () => {
    render(<VideoGrid participants={[makeEntry("local-1", true)]} trackRefs={[]} />);
    const grid = screen.getByTestId("video-grid");
    expect(grid.className).toContain("grid-cols-1");
  });

  test("gallery layout: 2 participants → grid-cols-2", () => {
    render(
      <VideoGrid
        participants={[makeEntry("local-1", true), makeEntry("remote-1")]}
        trackRefs={[]}
      />,
    );
    const grid = screen.getByTestId("video-grid");
    expect(grid.className).toContain("grid-cols-2");
  });

  test("gallery layout: 4 participants → grid-cols-2 grid-rows-2", () => {
    render(
      <VideoGrid
        participants={[
          makeEntry("local-1", true),
          makeEntry("r-1"),
          makeEntry("r-2"),
          makeEntry("r-3"),
        ]}
        trackRefs={[]}
      />,
    );
    const grid = screen.getByTestId("video-grid");
    expect(grid.className).toContain("grid-cols-2");
    expect(grid.className).toContain("grid-rows-2");
  });

  test("empty participants: renders empty grid", () => {
    render(<VideoGrid participants={[]} trackRefs={[]} />);
    const grid = screen.getByTestId("video-grid");
    expect(grid.children.length).toBe(0);
  });

  test("local + remote participants both rendered", () => {
    render(
      <VideoGrid
        participants={[makeEntry("local-1", true), makeEntry("remote-1")]}
        trackRefs={[]}
      />,
    );
    const grid = screen.getByTestId("video-grid");
    expect(grid.children.length).toBe(2);
  });

  test("screen share layout: renders main area + thumbnail strip", () => {
    const trackRefs = [
      makeTrackRef("remote-1", Track.Source.ScreenShare),
    ];

    render(
      <VideoGrid
        participants={[makeEntry("local-1", true), makeEntry("remote-1")]}
        trackRefs={trackRefs as unknown as TrackReferenceOrPlaceholder[]}
      />,
    );

    const grid = screen.getByTestId("video-grid");
    expect(grid.className).toContain("flex");
    expect(grid.className).not.toContain("grid-cols");
  });

  test("gallery layout: 6 participants → grid-cols-3 grid-rows-2", () => {
    render(
      <VideoGrid
        participants={[
          makeEntry("local-1", true),
          makeEntry("r-1"),
          makeEntry("r-2"),
          makeEntry("r-3"),
          makeEntry("r-4"),
          makeEntry("r-5"),
        ]}
        trackRefs={[]}
      />,
    );
    const grid = screen.getByTestId("video-grid");
    expect(grid.className).toContain("grid-cols-3");
    expect(grid.className).toContain("grid-rows-2");
  });
});
