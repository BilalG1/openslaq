import { renderHook, act } from "@testing-library/react-native";
import { Audio } from "expo-av";
import { useAudioRecorder } from "../useAudioRecorder";

describe("useAudioRecorder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts not recording", () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.duration).toBe(0);
  });

  it("start → stop returns a recording result with URI", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(Audio.requestPermissionsAsync).toHaveBeenCalled();
    expect(Audio.setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsRecordingIOS: true }),
    );

    let recordingResult: { uri: string; durationMs: number } | null = null;
    await act(async () => {
      recordingResult = await result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(recordingResult).not.toBeNull();
    expect(recordingResult!.uri).toBe("file:///mock-recording.m4a");
  });

  it("start → cancel returns null and resets state", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);

    await act(async () => {
      await result.current.cancelRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.duration).toBe(0);
  });

  it("stopRecording returns null when not recording", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    let recordingResult: unknown;
    await act(async () => {
      recordingResult = await result.current.stopRecording();
    });

    expect(recordingResult).toBeNull();
  });

  it("cleans up on unmount", async () => {
    const { result, unmount } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    unmount();
    // No error thrown means cleanup succeeded
  });
});
