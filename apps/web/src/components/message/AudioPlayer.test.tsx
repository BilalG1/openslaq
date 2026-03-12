import { describe, it, expect, beforeEach, jest } from "bun:test";
import { render, screen, cleanup } from "../../test-utils";
import { AudioPlayer } from "./AudioPlayer";

beforeEach(() => {
  cleanup();
  HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  HTMLMediaElement.prototype.pause = jest.fn();
  HTMLMediaElement.prototype.load = jest.fn();
});

describe("AudioPlayer", () => {
  it("renders with play button and filename", () => {
    render(<AudioPlayer src="https://example.com/audio.m4a" filename="voice-message.m4a" />);

    expect(screen.getByTestId("audio-player")).toBeTruthy();
    expect(screen.getByTestId("audio-play-button")).toBeTruthy();
    expect(screen.getByText("voice-message.m4a")).toBeTruthy();
    expect(screen.getByTestId("audio-play-button")).toBeTruthy();
  });

  it("renders time display", () => {
    render(<AudioPlayer src="https://example.com/audio.m4a" filename="test.m4a" />);

    expect(screen.getByText("0:00 / 0:00")).toBeTruthy();
  });

  it("play button triggers audio play", () => {
    render(<AudioPlayer src="https://example.com/audio.m4a" filename="test.m4a" />);

    const playButton = screen.getByTestId("audio-play-button");
    playButton.click();

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
});
