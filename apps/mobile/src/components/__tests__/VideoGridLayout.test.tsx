import React from "react";
import { render } from "@testing-library/react-native";
import { computeLayout } from "@openslaq/rn-layout-testing";
import { VideoGrid } from "../huddle/VideoGrid";
import { asUserId } from "@openslaq/shared";

jest.mock("@livekit/react-native", () => {
  const { View } = require("react-native");
  return {
    VideoTrack: (props: Record<string, unknown>) =>
      require("react").createElement(View, { testID: props.testID }),
  };
});

// Must match computeLayout viewport so tile-size math is consistent
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        surfaceTertiary: "#e0e0e0",
        textPrimary: "#000",
        textSecondary: "#666",
        avatarFallbackBg: "#ccc",
        avatarFallbackText: "#333",
      },
      brand: { primary: "#1264a3", danger: "#dc2626" },
    },
  }),
}));

const SCREEN_W = 390;
const SCREEN_H = 844;

function makeParticipant(id: string, overrides: Record<string, unknown> = {}) {
  return {
    userId: asUserId(id),
    displayName: `User ${id}`,
    isMuted: false,
    isCameraOn: false,
    isLocal: id === "local",
    videoTrackRef: undefined,
    screenShareTrackRef: undefined,
    ...overrides,
  };
}

describe("VideoGrid layout", () => {
  it("single participant fills the available area", async () => {
    const { toJSON } = render(
      <VideoGrid participants={[makeParticipant("u1")]} />,
    );
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });
    const tile = layout.byTestID.get("video-tile-u1");
    expect(tile).toBeDefined();
    // Single tile should use most of the available width (width - 20 padding)
    expect(tile!.width).toBeGreaterThan(SCREEN_W * 0.8);
  });

  it("2 participants are stacked vertically with roughly equal heights", async () => {
    const participants = [makeParticipant("u1"), makeParticipant("u2")];
    const { toJSON } = render(<VideoGrid participants={participants} />);
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });

    const t1 = layout.byTestID.get("video-tile-u1")!;
    const t2 = layout.byTestID.get("video-tile-u2")!;
    expect(t1).toBeDefined();
    expect(t2).toBeDefined();

    // Heights should be roughly equal
    expect(Math.abs(t1.height - t2.height)).toBeLessThanOrEqual(2);
    // Each tile should use full available width
    expect(t1.width).toBeGreaterThan(SCREEN_W * 0.8);
    expect(t2.width).toBeGreaterThan(SCREEN_W * 0.8);
    // Stacked vertically: t2 below t1
    expect(t2.top).toBeGreaterThan(t1.top);
    // Same horizontal position
    expect(t1.left).toBe(t2.left);
  });

  it("3 participants use 1-on-top + 2-on-bottom layout", async () => {
    const participants = [makeParticipant("u1"), makeParticipant("u2"), makeParticipant("u3")];
    const { toJSON } = render(<VideoGrid participants={participants} />);
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });

    const t1 = layout.byTestID.get("video-tile-u1")!;
    const t2 = layout.byTestID.get("video-tile-u2")!;
    const t3 = layout.byTestID.get("video-tile-u3")!;
    expect(t1).toBeDefined();
    expect(t2).toBeDefined();
    expect(t3).toBeDefined();

    // Top tile is full width
    expect(t1.width).toBeGreaterThan(SCREEN_W * 0.8);
    // Bottom tiles are roughly half width each
    expect(t2.width).toBeGreaterThan(SCREEN_W * 0.35);
    expect(t2.width).toBeLessThan(SCREEN_W * 0.55);
    expect(Math.abs(t2.width - t3.width)).toBeLessThanOrEqual(2);
    // Bottom tiles are on the same row, below the top tile
    expect(t2.top).toBe(t3.top);
    expect(t2.top).toBeGreaterThan(t1.top);
    // All tiles have roughly equal height
    expect(Math.abs(t1.height - t2.height)).toBeLessThanOrEqual(2);
  });

  it("4 participants form a 2x2 grid", async () => {
    const participants = [
      makeParticipant("u1"),
      makeParticipant("u2"),
      makeParticipant("u3"),
      makeParticipant("u4"),
    ];
    const { toJSON } = render(<VideoGrid participants={participants} />);
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });

    const tiles = ["u1", "u2", "u3", "u4"].map((id) => layout.byTestID.get(`video-tile-${id}`)!);
    tiles.forEach((t) => expect(t).toBeDefined());

    // First two tiles should be on the same row
    expect(tiles[0]!.top).toBe(tiles[1]!.top);
    // Last two tiles should be on a different row
    expect(tiles[2]!.top).toBe(tiles[3]!.top);
    expect(tiles[2]!.top).toBeGreaterThan(tiles[0]!.top);
    // Tiles on same row have roughly equal widths
    expect(Math.abs(tiles[0]!.width - tiles[1]!.width)).toBeLessThanOrEqual(2);
  });

  it("screen share layout gives presenter tile most of the height", async () => {
    const mockScreenTrackRef = {
      participant: { identity: "u1" },
      source: "screen_share",
      publication: {},
    };
    const participants = [
      makeParticipant("u1", { screenShareTrackRef: mockScreenTrackRef }),
      makeParticipant("u2"),
    ];
    const { toJSON } = render(<VideoGrid participants={participants} />);
    const layout = await computeLayout(toJSON(), { width: SCREEN_W, height: SCREEN_H });

    // Screen share tile is the first VideoTile (the large one)
    // Strip tiles are 72x72, so the main tile should be much taller
    const allTiles = ["u1", "u2"].map((id) =>
      layout.byTestID.get(`video-tile-${id}`),
    );
    // There are 3 video-tile nodes: 1 screen share + 2 in strip
    // The screen share tile should be significantly larger than strip tiles
    const root = layout.root;
    // Find all video-tile entries by walking the tree
    const tileSizes: { width: number; height: number }[] = [];
    function walk(entry: typeof root) {
      if (entry.testID?.startsWith("video-tile-")) {
        tileSizes.push({ width: entry.width, height: entry.height });
      }
      entry.children.forEach(walk);
    }
    walk(root);

    // Should have 3 tiles (1 main screen share + 2 strip)
    expect(tileSizes.length).toBe(3);
    // The largest tile (screen share) should be much bigger than strip tiles
    const sorted = [...tileSizes].sort((a, b) => b.width * b.height - a.width * a.height);
    const mainTileArea = sorted[0]!.width * sorted[0]!.height;
    const stripTileArea = sorted[1]!.width * sorted[1]!.height;
    expect(mainTileArea).toBeGreaterThan(stripTileArea * 5);
  });
});
