import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getWebCssVariables } from "@openslaq/shared";

export type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  /** Alias for `mode` — kept for compatibility with components that used `resolved`. */
  resolved: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycle: () => void;
}

const STORAGE_KEY = "openslaq-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyClass(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  const variables = getWebCssVariables(mode);
  for (const [name, value] of Object.entries(variables)) {
    document.documentElement.style.setProperty(name, value);
  }
}

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  // No valid stored value — use system preference and persist it
  const mode: ThemeMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  localStorage.setItem(STORAGE_KEY, mode);
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const m = readStoredMode();
    applyClass(m);
    return m;
  });

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyClass(next);
  }, []);

  const cycle = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      applyClass(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ mode, resolved: mode, setMode, cycle }),
    [mode, setMode, cycle],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
