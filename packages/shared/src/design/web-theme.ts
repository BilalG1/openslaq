import { designTokens } from "./tokens";
import type { ThemeMode } from "./types";

export function getWebCssVariables(mode: ThemeMode): Record<string, string> {
  const semantic = mode === "dark" ? designTokens.dark : designTokens.light;

  return {
    "--surface": semantic.surface,
    "--surface-secondary": semantic.surfaceSecondary,
    "--surface-tertiary": semantic.surfaceTertiary,
    "--surface-hover": semantic.surfaceHover,
    "--surface-selected": semantic.surfaceSelected,
    "--text-primary": semantic.textPrimary,
    "--text-secondary": semantic.textSecondary,
    "--text-muted": semantic.textMuted,
    "--text-faint": semantic.textFaint,
    "--border-default": semantic.borderDefault,
    "--border-secondary": semantic.borderSecondary,
    "--border-strong": semantic.borderStrong,
    "--border-input": semantic.borderInput,
    "--danger-bg": semantic.dangerBg,
    "--danger-border": semantic.dangerBorder,
    "--danger-text": semantic.dangerText,
    "--warning-bg": semantic.warningBg,
    "--warning-text": semantic.warningText,
    "--code-inline-bg": semantic.codeInlineBg,
    "--mark-bg": semantic.markBg,
    "--avatar-fallback-bg": semantic.avatarFallbackBg,
    "--avatar-fallback-text": semantic.avatarFallbackText,
    "--highlight-bg": semantic.highlightBg,
    "--color-slaq-blue": designTokens.brand.primary,
    "--color-slaq-green": designTokens.brand.success,
  };
}
