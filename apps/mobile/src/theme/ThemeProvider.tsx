import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { getMobileTheme, type MobileTheme, type ThemeMode } from "@openslaq/shared";
import {
  getThemePreference,
  setThemePreference as persistThemePreference,
  type ThemePreference,
} from "@/lib/theme-preferences";
import type { ReactNode } from "react";

interface ThemeContextValue {
  theme: MobileTheme;
  mode: ThemeMode;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function MobileThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    void getThemePreference().then(setThemePreferenceState);
  }, []);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemePreferenceState(pref);
    void persistThemePreference(pref);
  }, []);

  const systemMode: ThemeMode = systemColorScheme === "dark" ? "dark" : "light";
  const mode: ThemeMode = themePreference === "system" ? systemMode : themePreference;

  const value = useMemo(
    () => ({
      theme: getMobileTheme(mode),
      mode,
      themePreference,
      setThemePreference,
    }),
    [mode, themePreference, setThemePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useMobileTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value) return value;

  const fallback = getMobileTheme("light");
  return {
    theme: fallback,
    mode: "light",
    themePreference: "system",
    setThemePreference: () => {},
  };
}
