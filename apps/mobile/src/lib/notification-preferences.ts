import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIFICATIONS_ENABLED_KEY = "openslaq-notifications-enabled";
const NOTIFICATIONS_SOUND_KEY = "openslaq-notifications-sound";

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const [enabled, sound] = await Promise.all([
    AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY),
    AsyncStorage.getItem(NOTIFICATIONS_SOUND_KEY),
  ]);
  return {
    enabled: enabled === "true",
    sound: sound !== "false",
  };
}

export async function setNotificationPreferences(
  prefs: Partial<NotificationPreferences>,
): Promise<void> {
  const ops: Promise<void>[] = [];
  if (prefs.enabled !== undefined) {
    ops.push(AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(prefs.enabled)));
  }
  if (prefs.sound !== undefined) {
    ops.push(AsyncStorage.setItem(NOTIFICATIONS_SOUND_KEY, String(prefs.sound)));
  }
  await Promise.all(ops);
}
