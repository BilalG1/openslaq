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
