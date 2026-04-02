import { useEffect } from "react";
import { useSegments } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useMobileTheme } from "@/theme/ThemeProvider";

/**
 * Check whether the current route has an always-dark header (headerBg).
 *
 * useSegments() returns the route segment array including group names, e.g.:
 *   Home:    ["(app)", "<slug>", "(tabs)", "(channels)"]
 *   Channel: ["(app)", "<slug>", "(tabs)", "(channels)", "<id>"]
 *   Search:  ["(app)", "<slug>", "search"]
 *   DMs tab: ["(app)", "<slug>", "(tabs)", "(dms)"]
 *
 * A screen has a dark header when it's the channels index (home) or search.
 */
function hasDarkHeader(segments: string[]): boolean {
  const last = segments[segments.length - 1];

  // Home screen: last segment is "(channels)" (the index route of the channels tab)
  if (last === "(channels)") return true;

  // Search screen: always-dark search header
  if (last === "search") return true;

  return false;
}

/**
 * Centralized status bar style manager.
 * Place once in the root layout — it reacts to every route change
 * and sets the status bar style automatically.
 */
export function useStatusBar() {
  const segments = useSegments();
  const { mode } = useMobileTheme();
  const dark = hasDarkHeader(segments);

  useEffect(() => {
    setStatusBarStyle(dark ? "light" : mode === "dark" ? "light" : "dark");
  }, [dark, mode]);
}
