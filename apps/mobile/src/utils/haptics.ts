import * as Haptics from "expo-haptics";

export const haptics = {
  light: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  selection: () => void Haptics.selectionAsync(),
};
