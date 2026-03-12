import { Linking } from "react-native";

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SAFE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function openSafeUrl(url: string): boolean {
  if (!isSafeUrl(url)) return false;
  void Linking.openURL(url);
  return true;
}
