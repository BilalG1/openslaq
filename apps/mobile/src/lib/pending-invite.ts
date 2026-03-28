import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "openslaq_pending_invite";

export const setPendingInvite = async (code: string): Promise<void> => {
  await AsyncStorage.setItem(KEY, code);
};

export const consumePendingInvite = async (): Promise<string | null> => {
  const code = await AsyncStorage.getItem(KEY);
  if (code) await AsyncStorage.removeItem(KEY);
  return code;
};
