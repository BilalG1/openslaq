import React from "react";
import { render, screen } from "@testing-library/react-native";
import { VideoGrid } from "../huddle/VideoGrid";

jest.mock("@livekit/react-native", () => {
  const { View } = require("react-native");
  return {
    VideoTrack: (props: Record<string, unknown>) =>
      require("react").createElement(View, { testID: props.testID }),
  };
});

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
      brand: { primary: "#4A154B", danger: "#E01E5A" },
    },
  }),
}));

function makeParticipant(id: string, overrides: Record<string, unknown> = {}) {
  return {
    userId: id,
    displayName: `User ${id}`,
    isMuted: false,
    isCameraOn: false,
    isLocal: id === "local",
    videoTrackRef: undefined,
    screenShareTrackRef: undefined,
    ...overrides,
  };
}

describe("VideoGrid", () => {
  it("returns null for empty participants", () => {
    const { toJSON } = render(<VideoGrid participants={[]} />);
    expect(toJSON()).toBeNull();
  });

  it("renders gallery layout when no one is screen sharing", () => {
    const participants = [
      makeParticipant("u1"),
      makeParticipant("u2"),
    ];

    render(<VideoGrid participants={participants} />);

    expect(screen.getByTestId("video-tile-u1")).toBeTruthy();
    expect(screen.getByTestId("video-tile-u2")).toBeTruthy();
  });

  it("renders presentation layout when a participant is screen sharing", () => {
    const mockScreenTrackRef = {
      participant: { identity: "u1" },
      source: "screen_share",
      publication: {},
    };

    const participants = [
      makeParticipant("u1", { screenShareTrackRef: mockScreenTrackRef }),
      makeParticipant("u2"),
    ];

    render(<VideoGrid participants={participants} />);

    // Both tiles should render (screen share main + both in strip)
    const tiles = screen.getAllByTestId(/^video-tile-/);
    // 1 screen share tile + 2 strip tiles = 3
    expect(tiles.length).toBe(3);
  });

  it("renders single participant", () => {
    const participants = [makeParticipant("u1")];

    render(<VideoGrid participants={participants} />);

    expect(screen.getByTestId("video-tile-u1")).toBeTruthy();
  });
});
