import type { ChannelId, EphemeralMessage } from "@openslaq/shared";
import { EphemeralMessageItem } from "../../components/message/EphemeralMessage";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const mockMessage: EphemeralMessage = {
  id: "eph-1",
  channelId: "ch_showcase" as ChannelId,
  text: "This message is only visible to you. Try /help for a list of commands.",
  senderName: "Slackbot",
  senderAvatarUrl: null,
  createdAt: new Date().toISOString(),
  ephemeral: true,
};

const longMessage: EphemeralMessage = {
  id: "eph-2",
  channelId: "ch_showcase" as ChannelId,
  text: "Command not found: /deploy. Did you mean /remind? Available commands: /help, /remind, /mute, /unmute, /status, /away.",
  senderName: "Slackbot",
  senderAvatarUrl: null,
  createdAt: new Date().toISOString(),
  ephemeral: true,
};

export const ephemeralMessageStory: ComponentStory = {
  id: "ephemeral-message",
  name: "EphemeralMessage",
  source: "components/message/EphemeralMessage.tsx",
  render: () => (
    <>
      <VariantGrid title="Variants">
        <VariantItem label="basic">
          <div className="w-[500px]">
            <EphemeralMessageItem message={mockMessage} />
          </div>
        </VariantItem>
        <VariantItem label="long text">
          <div className="w-[500px]">
            <EphemeralMessageItem message={longMessage} />
          </div>
        </VariantItem>
      </VariantGrid>
    </>
  ),
};
