import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "openslaq-draft-";

export async function getAllDraftKeys(): Promise<string[]> {
  const allKeys = await AsyncStorage.getAllKeys();
  return allKeys
    .filter((k) => k.startsWith(PREFIX))
    .map((k) => k.slice(PREFIX.length));
}

export async function getAllDrafts(): Promise<Array<{ draftKey: string; text: string }>> {
  const allKeys = await AsyncStorage.getAllKeys();
  const draftKeys = allKeys.filter((k) => k.startsWith(PREFIX));
  if (draftKeys.length === 0) return [];
  const pairs = await AsyncStorage.multiGet(draftKeys);
  return pairs
    .filter((pair): pair is [string, string] => pair[1] != null)
    .map(([key, text]) => ({ draftKey: key.slice(PREFIX.length), text }));
}

export async function removeDraft(draftKey: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIX + draftKey);
}

export async function clearAllDrafts(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const draftKeys = allKeys.filter((k) => k.startsWith(PREFIX));
  if (draftKeys.length > 0) {
    await AsyncStorage.multiRemove(draftKeys);
  }
}
