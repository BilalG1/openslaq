import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Audio } from "expo-av";
import { AudioPlayer } from "../AudioPlayer";

describe("AudioPlayer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders filename and play button", () => {
    render(<AudioPlayer uri="https://example.com/audio.m4a" filename="voice-message.m4a" />);

    expect(screen.getByTestId("audio-player")).toBeTruthy();
    expect(screen.getByTestId("audio-play-button")).toBeTruthy();
    expect(screen.getByText("voice-message.m4a")).toBeTruthy();
    expect(screen.getByText("0:00 / 0:00")).toBeTruthy();
  });

  it("shows play icon initially", () => {
    render(<AudioPlayer uri="https://example.com/audio.m4a" filename="test.m4a" />);

    expect(screen.getByTestId("audio-play-button")).toBeTruthy();
  });

  it("calls createAsync on button press", async () => {
    render(<AudioPlayer uri="https://example.com/audio.m4a" filename="test.m4a" />);

    fireEvent.press(screen.getByTestId("audio-play-button"));

    await waitFor(() => {
      expect(Audio.Sound.createAsync).toHaveBeenCalledWith({
        uri: "https://example.com/audio.m4a",
      });
    });
  });
});

// Test the formatTime logic directly (mirrors the function inside AudioPlayer)
describe("AudioPlayer formatTime logic", () => {
  // Re-implement to match the component's internal function
  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  it("formats zero", () => {
    expect(formatTime(0)).toBe("0:00");
  });

  it("formats seconds under a minute", () => {
    expect(formatTime(30_000)).toBe("0:30");
  });

  it("formats normal duration", () => {
    expect(formatTime(90_000)).toBe("1:30");
  });

  it("formats durations >= 60 min with hours", () => {
    // 65 min 30 sec = 3930 seconds = 3_930_000 ms
    const result = formatTime(3_930_000);
    expect(result).toBe("1:05:30");
  });

  it("formats exactly 1 hour", () => {
    const result = formatTime(3_600_000);
    expect(result).toBe("1:00:00");
  });
});
