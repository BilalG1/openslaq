import { useEffect, useState } from "react";
import { isTauri } from "../lib/tauri";

export function useWindowFocused(): boolean {
  const [focused, setFocused] = useState(!document.hidden);

  useEffect(() => {
    if (isTauri()) {
      let cancelled = false;
      let unlisten: (() => void) | undefined;
      import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
        if (cancelled) return;
        getCurrentWindow()
          .onFocusChanged(({ payload }) => {
            if (!cancelled) setFocused(payload);
          })
          .then((fn) => {
            if (cancelled) {
              fn();
            } else {
              unlisten = fn;
            }
          });
      });
      return () => {
        cancelled = true;
        unlisten?.();
      };
    }

    const onVisibility = () => setFocused(!document.hidden);
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return focused;
}
