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
  overlay: string;
  codeHeaderBg: string;
  codeBg: string;
  ephemeralBg: string;
  ephemeralBorder: string;
  headerBg: string;
  headerText: string;
  headerSearchBg: string;
  huddleActiveBg: string;
  huddleActiveText: string;
  mentionGroupBg: string;
  mentionGroupText: string;
  mentionUserBg: string;
  recordingIndicator: string;
  screenShareText: string;
  galleryOverlayText: string;
  galleryOverlayTextSecondary: string;
  codeInlineText: string;
  shadowColor: string;
  iconDefault: string;
  overlayHeavy: string;
  overlayLight: string;
  overlayLightText: string;
  presenceOnline: string;
  presenceOffline: string;
  warningBg: string;
  warningText: string;
  ownerBadge: string;
  copiedBg: string;
  huddleBg: string;
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
