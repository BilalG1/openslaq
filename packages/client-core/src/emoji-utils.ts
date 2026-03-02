import type { CustomEmoji } from "@openslaq/shared";

const CUSTOM_EMOJI_REGEX = /^:custom:([a-z0-9][a-z0-9_-]*[a-z0-9]):$/;

export function isCustomEmojiShortcode(text: string): boolean {
  return CUSTOM_EMOJI_REGEX.test(text);
}

export function parseCustomEmojiName(shortcode: string): string | null {
  const match = shortcode.match(CUSTOM_EMOJI_REGEX);
  return match?.[1] ?? null;
}

export function buildCustomEmojiShortcode(name: string): string {
  return `:custom:${name}:`;
}

export function findCustomEmoji(name: string, emojis: CustomEmoji[]): CustomEmoji | undefined {
  return emojis.find((e) => e.name === name);
}
