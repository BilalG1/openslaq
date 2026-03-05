export type ThemeMode = "light" | "dark";

export interface SemanticColorTokens {
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  surfaceHover: string;
  surfaceSelected: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  borderDefault: string;
  borderSecondary: string;
  borderStrong: string;
  borderInput: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  codeInlineBg: string;
  markBg: string;
  avatarFallbackBg: string;
  avatarFallbackText: string;
  highlightBg: string;
  headerBg: string;
  headerText: string;
  headerSearchBg: string;
}

export interface BrandColorTokens {
  primary: string;
  success: string;
  danger: string;
}

export interface InteractionColorTokens {
  focusRing: string;
  badgeUnreadBg: string;
  badgeUnreadText: string;
}

export interface DesignTokens {
  brand: BrandColorTokens;
  interaction: InteractionColorTokens;
  light: SemanticColorTokens;
  dark: SemanticColorTokens;
}

export interface MobileTheme {
  mode: ThemeMode;
  colors: SemanticColorTokens;
  brand: BrandColorTokens;
  interaction: InteractionColorTokens;
}
