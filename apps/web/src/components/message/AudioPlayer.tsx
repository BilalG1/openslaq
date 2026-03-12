import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

interface Props {
  src: string;
  filename: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AudioPlayer({ src, filename }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  }, [isPlaying]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      audio.currentTime = ratio * duration;
    },
    [duration],
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      data-testid="audio-player"
      className="max-w-[360px] rounded-md bg-surface-tertiary px-3 py-2 flex items-center gap-2"
    >
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        data-testid="audio-play-button"
        onClick={togglePlayPause}
        className="w-8 h-8 rounded-full bg-slaq-blue text-white flex items-center justify-center text-sm font-bold shrink-0 cursor-pointer border-0"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-primary truncate mb-1">{filename}</div>
        <div
          className="h-1 rounded-full bg-border cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-1 rounded-full bg-slaq-blue"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="text-[11px] text-faint shrink-0">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
}
