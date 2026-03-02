import { TypingIndicator } from "../../components/message/TypingIndicator";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const oneUser = [{ userId: "u1", displayName: "Alice", expiresAt: Date.now() + 10_000 }];
const twoUsers = [
  { userId: "u1", displayName: "Alice", expiresAt: Date.now() + 10_000 },
  { userId: "u2", displayName: "Bob", expiresAt: Date.now() + 10_000 },
];
const threeUsers = [
  { userId: "u1", displayName: "Alice", expiresAt: Date.now() + 10_000 },
  { userId: "u2", displayName: "Bob", expiresAt: Date.now() + 10_000 },
  { userId: "u3", displayName: "Charlie", expiresAt: Date.now() + 10_000 },
];

export const typingIndicatorStory: ComponentStory = {
  id: "typing-indicator",
  name: "TypingIndicator",
  source: "components/message/TypingIndicator.tsx",
  render: () => (
    <>
      <VariantGrid title="User Count Variants">
        <VariantItem label="1 user">
          <TypingIndicator typingUsers={oneUser} />
        </VariantItem>
        <VariantItem label="2 users">
          <TypingIndicator typingUsers={twoUsers} />
        </VariantItem>
        <VariantItem label="3+ users">
          <TypingIndicator typingUsers={threeUsers} />
        </VariantItem>
        <VariantItem label="empty">
          <TypingIndicator typingUsers={[]} />
        </VariantItem>
      </VariantGrid>
    </>
  ),
};
