import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@openslaq/client-core";
import { useSocket } from "../../hooks/useSocket";
import { Loader2, Wifi, WifiOff } from "lucide-react";

type BannerState = "hidden" | "offline" | "reconnecting" | "connected";

export function ConnectionBanner() {
  const { status } = useSocket();
  const isOnline = useOnlineStatus();
  const prevStatusRef = useRef(status);
  const [showConnected, setShowConnected] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === "connected" && (prev === "reconnecting" || prev === "error")) {
      setShowConnected(true);
      timerRef.current = setTimeout(() => setShowConnected(false), 3000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status]);

  let bannerState: BannerState = "hidden";
  if (!isOnline) {
    bannerState = "offline";
  } else if (status === "reconnecting" || status === "error") {
    bannerState = "reconnecting";
  } else if (showConnected) {
    bannerState = "connected";
  }

  if (bannerState === "hidden") return null;

  if (bannerState === "offline") {
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 py-1.5 bg-warning-bg text-warning-text text-[13px] font-medium"
        role="status"
        data-testid="connection-banner"
      >
        <WifiOff className="w-4 h-4" />
        <span>You're offline</span>
      </div>
    );
  }

  if (bannerState === "reconnecting") {
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 py-1.5 bg-warning-bg text-warning-text text-[13px] font-medium"
        role="status"
        data-testid="connection-banner"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Reconnecting...</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-1.5 bg-slaq-green text-white text-[13px] font-medium"
      role="status"
      data-testid="connection-banner"
    >
      <Wifi className="w-4 h-4" />
      <span>Connected</span>
    </div>
  );
}
