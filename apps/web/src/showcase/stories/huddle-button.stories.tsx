import type { ChannelId, UserId } from "@openslaq/shared";
import { HuddleHeaderButton } from "../../components/huddle/HuddleHeaderButton";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const noop = () => {};
const channelId = "ch_showcase" as string;

export const huddleButtonStory: ComponentStory = {
  id: "huddle-button",
  name: "HuddleHeaderButton",
  source: "components/huddle/HuddleHeaderButton.tsx",
  render: () => (
    <>
      <VariantGrid title="No Huddle">
        <VariantItem label="start button">
          <HuddleHeaderButton
            channelId={channelId}
            activeHuddle={null}
            currentHuddleChannelId={null}
            onStart={noop}
            onJoin={noop}
          />
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Active Huddle (Join)">
        <VariantItem label="join button">
          <HuddleHeaderButton
            channelId={channelId}
            activeHuddle={{
              channelId: channelId as ChannelId,
              participants: [
                { userId: "u_alice" as UserId, isMuted: false, isCameraOn: false, isScreenSharing: false, joinedAt: new Date().toISOString() },
                { userId: "u_bob" as UserId, isMuted: true, isCameraOn: false, isScreenSharing: false, joinedAt: new Date().toISOString() },
              ],
              startedAt: new Date().toISOString(),
              livekitRoom: null,
              screenShareUserId: null,
              messageId: null,
            }}
            currentHuddleChannelId={null}
            onStart={noop}
            onJoin={noop}
          />
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="In Current Huddle">
        <VariantItem label="in progress">
          <HuddleHeaderButton
            channelId={channelId}
            activeHuddle={{
              channelId: channelId as ChannelId,
              participants: [
                { userId: "u_viewer" as UserId, isMuted: false, isCameraOn: false, isScreenSharing: false, joinedAt: new Date().toISOString() },
              ],
              startedAt: new Date().toISOString(),
              livekitRoom: null,
              screenShareUserId: null,
              messageId: null,
            }}
            currentHuddleChannelId={channelId}
            onStart={noop}
            onJoin={noop}
          />
        </VariantItem>
      </VariantGrid>
    </>
  ),
};
