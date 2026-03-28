import { memo, useMemo } from "react";
import { Text, Image, StyleSheet } from "react-native";
import Markdown, { type RenderRules } from "@ronradtke/react-native-markdown-display";
import type { Mention, UserId, CustomEmoji } from "@openslaq/shared";
import { findCustomEmoji } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { MentionBadge } from "./MentionBadge";
import { openSafeUrl } from "@/utils/url-validation";
import { CodeBlock } from "./CodeBlock";

import { TRANSPARENT } from "@/theme/constants";

interface Props {
  content: string;
  mentions?: Mention[];
  onPressMention?: (userId: UserId) => void;
  customEmojis?: CustomEmoji[];
}

const MENTION_REGEX = /<@([^>]+)>/g;
const CUSTOM_EMOJI_INLINE_REGEX = /:custom:([a-z0-9][a-z0-9_-]*[a-z0-9]):/g;

/**
 * Preprocess mentions and custom emoji shortcodes into markdown syntax
 * so the markdown renderer can handle them via custom rules.
 */
function preprocessContent(content: string, mentions: Mention[]): string {
  let result = content.replace(MENTION_REGEX, (_match, token: string) => {
    if (token === "here" || token === "channel") {
      return `[@${token}](mention:${token})`;
    }
    const mention = mentions.find((m) => m.userId === token);
    const displayName = mention?.displayName ?? token;
    return `[@${displayName}](mention:${token})`;
  });
  // Convert :custom:name: shortcodes to markdown image syntax
  result = result.replace(CUSTOM_EMOJI_INLINE_REGEX, (_match, name: string) => {
    return `![${name}](custom-emoji:${name})`;
  });
  return result;
}

const staticStyles = StyleSheet.create({
  customEmojiInline: {
    width: 20,
    height: 20,
  },
  markdownImage: {
    width: 200,
    height: 200,
  },
});

function MessageContentInner({ content, mentions = [], onPressMention, customEmojis = [] }: Props) {
  const { theme } = useMobileTheme();

  const processedContent = useMemo(
    () => preprocessContent(content, mentions),
    [content, mentions],
  );

  const markdownStyles = useMemo(
    () => ({
      body: {
        color: theme.colors.textSecondary,
        fontSize: 15,
        lineHeight: 21,
      },
      paragraph: {
        marginTop: 0,
        marginBottom: 0,
      },
      strong: {
        fontWeight: "700" as const,
        color: theme.colors.textPrimary,
      },
      em: {
        fontStyle: "italic" as const,
      },
      s: {
        textDecorationLine: "line-through" as const,
      },
      code_inline: {
        backgroundColor: theme.colors.codeInlineBg,
        color: theme.colors.codeInlineText,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 3,
        fontSize: 13,
        fontFamily: "Courier",
      },
      blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.borderStrong,
        paddingLeft: 10,
        marginVertical: 4,
        backgroundColor: TRANSPARENT,
      },
      bullet_list: {
        marginVertical: 2,
      },
      ordered_list: {
        marginVertical: 2,
      },
      list_item: {
        marginVertical: 1,
      },
      link: {
        color: theme.brand.primary,
        textDecorationLine: "underline" as const,
      },
      fence: {
        // Hide default fence styling — we render our own CodeBlock
        display: "none" as const,
      },
    }),
    [theme],
  );

  const rules: RenderRules = useMemo(
    () => ({
      link: (node, children, _parent, styles) => {
        const href = node.attributes?.href ?? "";
        if (href.startsWith("mention:")) {
          const token = href.slice("mention:".length);
          // Extract display name from the link text (first child text)
          const displayName = node.children?.[0]?.content?.replace(/^@/, "") ?? token;
          return (
            <MentionBadge
              key={node.key}
              token={token}
              displayName={displayName}
              onPress={onPressMention}
            />
          );
        }
        return (
          <Text
            key={node.key}
            style={styles.link}
            onPress={() => {
              if (href) openSafeUrl(href);
            }}
          >
            {children}
          </Text>
        );
      },
      fence: (node) => {
        const language = node.sourceInfo ?? undefined;
        const code = node.content?.replace(/\n$/, "") ?? "";
        return <CodeBlock key={node.key} language={language}>{code}</CodeBlock>;
      },
      image: (node) => {
        const src = node.attributes?.src ?? "";
        const alt = node.attributes?.alt ?? "";
        if (src.startsWith("custom-emoji:")) {
          const name = src.slice("custom-emoji:".length);
          const found = findCustomEmoji(name, customEmojis);
          if (found) {
            return (
              <Image
                key={node.key}
                testID={`custom-emoji-inline-${name}`}
                source={{ uri: found.url }}
                style={staticStyles.customEmojiInline}
                accessibilityLabel={name}
                accessibilityHint={`Custom emoji: ${name}`}
              />
            );
          }
          return <Text key={node.key}>:{name}:</Text>;
        }
        return (
          <Image
            key={node.key}
            source={{ uri: src }}
            accessibilityLabel={alt}
            accessibilityHint="Embedded image in message"
            resizeMode="contain"
            style={staticStyles.markdownImage}
          />
        );
      },
    }),
    [onPressMention, customEmojis],
  );

  return (
    <Markdown style={markdownStyles} rules={rules}>
      {processedContent}
    </Markdown>
  );
}

export const MessageContent = memo(MessageContentInner);
