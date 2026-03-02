import { useMemo } from "react";
import ReactMarkdown, { MarkdownHooks } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import type { Components } from "react-markdown";
import type { Mention, CustomEmoji } from "@openslaq/shared";
import { findCustomEmoji } from "@openslaq/client-core";
import { CodeBlock } from "./CodeBlock";

interface MessageContentProps {
  content: string;
  mentions?: Mention[];
  onOpenProfile?: (userId: string) => void;
  customEmojis?: CustomEmoji[];
}

const sharedComponents: Components = {
  p: ({ children }) => <p className="m-0">{children}</p>,
  code: ({ children, className }) => {
    // Block code (inside <pre>) has a className from the language tag — let Shiki handle styling
    if (className) {
      return <code className={className}>{children}</code>;
    }
    // Inline code
    return (
      <code className="bg-code-inline-bg px-1 py-px rounded text-[13px]">
        {children}
      </code>
    );
  },
  pre: CodeBlock,
  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-border-strong my-1 pl-3 text-muted">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-slaq-blue">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="my-1 pl-6 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 pl-6 list-decimal">{children}</ol>,
};

// Remark plugin: split text nodes on mention/emoji tokens into custom inline nodes
const TOKEN_PATTERN = /<@([^>]+)>|:custom:([a-z0-9][a-z0-9_-]*[a-z0-9]):/g;

function remarkTokens() {
  function walk(node: any) {
    if (!node.children) return;
    const next: any[] = [];
    let changed = false;
    for (const child of node.children) {
      if (child.type !== "text") {
        walk(child);
        next.push(child);
        continue;
      }
      TOKEN_PATTERN.lastIndex = 0;
      const val: string = child.value;
      let last = 0;
      let m: RegExpExecArray | null;
      const parts: any[] = [];
      while ((m = TOKEN_PATTERN.exec(val)) !== null) {
        if (m.index > last) parts.push({ type: "text", value: val.slice(last, m.index) });
        if (m[1]) {
          parts.push({
            type: "mention-token",
            data: { hName: "mention-badge", hProperties: { token: m[1] } },
            children: [],
          });
        } else if (m[2]) {
          parts.push({
            type: "emoji-token",
            data: { hName: "custom-emoji-inline", hProperties: { name: m[2] } },
            children: [],
          });
        }
        last = m.index + m[0].length;
      }
      if (parts.length === 0) {
        next.push(child);
      } else {
        if (last < val.length) parts.push({ type: "text", value: val.slice(last) });
        next.push(...parts);
        changed = true;
      }
    }
    if (changed) node.children = next;
  }
  return (tree: any) => { walk(tree); };
}

// Stable plugin arrays — MarkdownHooks' useEffect depends on array identity
const remarkPluginsWithTokens = [remarkGfm, remarkTokens];
const rehypePlugins = [[rehypeShiki, {
  themes: { light: "light-plus", dark: "dark-plus" },
  addLanguageClass: true,
  langAlias: { typescriptreact: "tsx" },
}] as [typeof rehypeShiki, Parameters<typeof rehypeShiki>[0]]];

function MentionBadge({
  token,
  mentions,
  onOpenProfile,
}: {
  token: string;
  mentions: Mention[];
  onOpenProfile?: (userId: string) => void;
}) {
  if (token === "here") {
    return (
      <span className="inline bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1 rounded font-medium text-[13px]">
        @here
      </span>
    );
  }
  if (token === "channel") {
    return (
      <span className="inline bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1 rounded font-medium text-[13px]">
        @channel
      </span>
    );
  }

  const mention = mentions.find((m) => m.userId === token);
  const displayName = mention?.displayName ?? token;

  return (
    <button
      type="button"
      onClick={() => onOpenProfile?.(token)}
      className="inline bg-[#1264a31a] text-slaq-blue px-1 rounded font-medium text-[13px] border-none cursor-pointer hover:underline"
    >
      @{displayName}
    </button>
  );
}

function CustomEmojiInline({ name, customEmojis }: { name: string; customEmojis?: CustomEmoji[] }) {
  const emoji = customEmojis ? findCustomEmoji(name, customEmojis) : undefined;
  if (emoji) {
    return <img src={emoji.url} alt={`:${name}:`} title={`:${name}:`} className="inline w-5 h-5 align-text-bottom" />;
  }
  return <span>:{name}:</span>;
}

export function MessageContent({ content, mentions = [], onOpenProfile, customEmojis }: MessageContentProps) {
  const hasCodeBlock = content.includes("```");

  const components = useMemo(() => ({
    ...sharedComponents,
    "mention-badge": (props: any) => {
      const token: string | undefined = props.token;
      return token ? <MentionBadge token={token} mentions={mentions} onOpenProfile={onOpenProfile} /> : null;
    },
    "custom-emoji-inline": (props: any) => {
      const name: string | undefined = props.name;
      return name ? <CustomEmojiInline name={name} customEmojis={customEmojis} /> : null;
    },
  } as Components), [mentions, onOpenProfile, customEmojis]);

  return (
    <div className="text-sm leading-normal mt-0.5">
      {hasCodeBlock ? (
        <MarkdownHooks
          remarkPlugins={remarkPluginsWithTokens}
          rehypePlugins={rehypePlugins}
          components={components}
          fallback={<ReactMarkdown remarkPlugins={remarkPluginsWithTokens} components={components}>{content}</ReactMarkdown>}
        >
          {content}
        </MarkdownHooks>
      ) : (
        <ReactMarkdown remarkPlugins={remarkPluginsWithTokens} components={components}>
          {content}
        </ReactMarkdown>
      )}
    </div>
  );
}
