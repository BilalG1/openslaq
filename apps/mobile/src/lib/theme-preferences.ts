import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_PREFERENCE_KEY = "openslaq-theme-preference";

export type ThemePreference = "system" | "light" | "dark";

export async function getThemePreference(): Promise<ThemePreference> {
  const value = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
  if (value === "light" || value === "dark") return value;
  return "system";
}

export async function setThemePreference(pref: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_PREFERENCE_KEY, pref);
}
