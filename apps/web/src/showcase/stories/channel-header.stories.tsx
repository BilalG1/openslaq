import { ChannelHeader } from "../../components/channel/ChannelHeader";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const noop = () => {};

export const channelHeaderStory: ComponentStory = {
  id: "channel-header",
  name: "ChannelHeader",
  source: "components/channel/ChannelHeader.tsx",
  render: () => (
    <>
      <VariantGrid title="Public Channel">
        <VariantItem label="default">
          <div className="w-[700px] border border-border-default rounded">
            <ChannelHeader
              channelName="general"
              channelId="ch_1"
              channelType="public"
              memberCount={24}
              onUpdateDescription={noop}
              onToggleStar={noop}
              onOpenPins={noop}
              pinnedCount={3}
              onOpenFiles={noop}
            />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Private Channel">
        <VariantItem label="lock icon">
          <div className="w-[700px] border border-border-default rounded">
            <ChannelHeader
              channelName="secret-project"
              channelId="ch_2"
              channelType="private"
              memberCount={5}
              onUpdateDescription={noop}
              onToggleStar={noop}
              onOpenPins={noop}
              pinnedCount={0}
            />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Starred">
        <VariantItem label="star filled">
          <div className="w-[700px] border border-border-default rounded">
            <ChannelHeader
              channelName="design"
              channelId="ch_3"
              channelType="public"
              memberCount={12}
              isStarred
              onToggleStar={noop}
              onUpdateDescription={noop}
              onOpenPins={noop}
              pinnedCount={1}
            />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="With Topic">
        <VariantItem label="topic text">
          <div className="w-[700px] border border-border-default rounded">
            <ChannelHeader
              channelName="engineering"
              channelId="ch_4"
              channelType="public"
              memberCount={18}
              description="All things engineering - PRs, deploys, and architecture"
              onUpdateDescription={noop}
              onToggleStar={noop}
              onOpenPins={noop}
              pinnedCount={7}
              onOpenFiles={noop}
            />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="With Pins">
        <VariantItem label="pin count badge">
          <div className="w-[700px] border border-border-default rounded">
            <ChannelHeader
              channelName="releases"
              channelId="ch_5"
              channelType="public"
              memberCount={30}
              onUpdateDescription={noop}
              onToggleStar={noop}
              onOpenPins={noop}
              pinnedCount={12}
            />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Archived">
        <VariantItem label="archived badge">
          <div className="w-[700px] border border-border-default rounded">
            <ChannelHeader
              channelName="old-project"
              channelId="ch_6"
              channelType="public"
              memberCount={8}
              isArchived
              canArchive
              onUnarchive={noop}
              onUpdateDescription={noop}
              onToggleStar={noop}
              onOpenPins={noop}
              pinnedCount={2}
            />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Muted">
        <VariantItem label="muted bell icon">
          <div className="w-[700px] border border-border-default rounded">
            <ChannelHeader
              channelName="noisy-channel"
              channelId="ch_7"
              channelType="public"
              memberCount={50}
              notificationLevel="muted"
              onSetNotificationLevel={noop}
              onUpdateDescription={noop}
              onToggleStar={noop}
              onOpenPins={noop}
              pinnedCount={0}
            />
          </div>
        </VariantItem>
      </VariantGrid>
    </>
  ),
};
