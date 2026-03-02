import { useCallback, useEffect, useRef, useState } from "react";

interface UseResizableOptions {
  side: "left" | "right";
  min: number;
  max: number;
  defaultWidth: number;
  storageKey: string;
}

function readStoredWidth(key: string, min: number, max: number, fallback: number): number {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed)) return Math.min(max, Math.max(min, parsed));
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function useResizable({ side, min, max, defaultWidth, storageKey }: UseResizableOptions) {
  const [width, setWidth] = useState(() => readStoredWidth(storageKey, min, max, defaultWidth));
  const [isDragging, setIsDragging] = useState(false);
  const widthRef = useRef(width);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = widthRef.current;

      setIsDragging(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      function onMouseMove(ev: MouseEvent) {
        const delta = ev.clientX - startX;
        const newWidth = side === "right"
          ? startWidth + delta
          : startWidth - delta;
        const clamped = Math.min(max, Math.max(min, newWidth));
        widthRef.current = clamped;
        setWidth(clamped);
      }

      function cleanup() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        cleanupRef.current = null;
      }

      function onMouseUp() {
        cleanup();
        setIsDragging(false);
        try {
          localStorage.setItem(storageKey, String(widthRef.current));
        } catch {
          // ignore
        }
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      cleanupRef.current = cleanup;
    },
    [side, min, max, storageKey],
  );

  return { width, isDragging, handleMouseDown };
}
