import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import { Alert } from "react-native";

export interface RecordingResult {
  uri: string;
  durationMs: number;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingResult | null>;
  cancelRecording: () => Promise<void>;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearInterval_ = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert(
        "Permission Required",
        "Microphone access is needed to record voice messages.",
      );
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    await recording.startAsync();

    recordingRef.current = recording;
    setIsRecording(true);
    setDuration(0);

    intervalRef.current = setInterval(async () => {
      if (!recordingRef.current) return;
      try {
        const status = await recordingRef.current.getStatusAsync();
        setDuration(Math.floor((status.durationMillis ?? 0) / 1000));
      } catch {
        // recording may have been stopped
      }
    }, 250);
  }, []);

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    const recording = recordingRef.current;
    if (!recording) return null;

    clearInterval_();

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const status = await recording.getStatusAsync();

    recordingRef.current = null;
    setIsRecording(false);
    setDuration(0);

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    if (!uri) return null;
    return { uri, durationMs: status.durationMillis ?? 0 };
  }, [clearInterval_]);

  const cancelRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    clearInterval_();

    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // already stopped
    }

    recordingRef.current = null;
    setIsRecording(false);
    setDuration(0);

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  }, [clearInterval_]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval_();
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
        void Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      }
    };
  }, [clearInterval_]);

  return { isRecording, duration, startRecording, stopRecording, cancelRecording };
}
