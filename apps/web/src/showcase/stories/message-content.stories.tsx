import type { Mention, UserId } from "@openslaq/shared";
import { MessageContent } from "../../components/message/MessageContent";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const mentions: Mention[] = [
  { userId: "u_alice" as UserId, displayName: "Alice Chen", type: "user" },
  { userId: "u_bob" as UserId, displayName: "Bob Park", type: "user" },
];

export const messageContentStory: ComponentStory = {
  id: "message-content",
  name: "MessageContent",
  source: "components/message/MessageContent.tsx",
  render: () => (
    <>
      <VariantGrid title="Plain Text">
        <VariantItem label="simple">
          <div className="w-[500px]">
            <MessageContent content="Hello, this is a plain text message with no formatting." />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Markdown">
        <VariantItem label="bold + italic + list">
          <div className="w-[500px]">
            <MessageContent content={"**Bold text** and *italic text* and ~~strikethrough~~\n\n- Item one\n- Item two\n- Item three"} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Code Block">
        <VariantItem label="typescript">
          <div className="w-[500px]">
            <MessageContent content={'Here\'s a snippet:\n\n```typescript\nfunction greet(name: string) {\n  return `Hello, ${name}!`;\n}\n```'} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Inline Code">
        <VariantItem label="with backticks">
          <div className="w-[500px]">
            <MessageContent content="Run `bun install` then `bun run dev` to start the server." />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="@user Mention">
        <VariantItem label="user mention">
          <div className="w-[500px]">
            <MessageContent content="Hey <@u_alice>, can you review this?" mentions={mentions} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="@here / @channel">
        <VariantItem label="@here">
          <div className="w-[500px]">
            <MessageContent content="<@here> Standup in 5 minutes!" />
          </div>
        </VariantItem>
        <VariantItem label="@channel">
          <div className="w-[500px]">
            <MessageContent content="<@channel> Important announcement: new deploy process." />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Links">
        <VariantItem label="URL">
          <div className="w-[500px]">
            <MessageContent content="Check out [the docs](https://example.com/docs) for more info." />
          </div>
        </VariantItem>
      </VariantGrid>
    </>
  ),
};
