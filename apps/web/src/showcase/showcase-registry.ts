import type { ReactNode } from "react";

export interface ComponentStory {
  id: string;
  name: string;
  source: string;
  render: () => ReactNode;
}

export interface StoryCategory {
  id: string;
  label: string;
  stories: ComponentStory[];
}

// Lazy imports to keep the registry lightweight
import { buttonStory } from "./stories/button.stories";
import { inputStory } from "./stories/input.stories";
import { badgeStory } from "./stories/badge.stories";
import { avatarStory } from "./stories/avatar.stories";
import { daySeparatorStory } from "./stories/day-separator.stories";
import { typingIndicatorStory } from "./stories/typing-indicator.stories";
import { ephemeralMessageStory } from "./stories/ephemeral-message.stories";
import { linkPreviewStory } from "./stories/link-preview.stories";
import { dialogStory } from "./stories/dialog.stories";
import { dropdownMenuStory } from "./stories/dropdown-menu.stories";
import { tooltipStory } from "./stories/tooltip.stories";
import { selectStory } from "./stories/select.stories";
import { switchStory } from "./stories/switch.stories";
import { messageItemStory } from "./stories/message-item.stories";
import { messageContentStory } from "./stories/message-content.stories";
import { sharedMessageStory } from "./stories/shared-message.stories";
import { reactionBarStory } from "./stories/reaction-bar.stories";
import { messageActionBarStory } from "./stories/message-action-bar.stories";
import { channelHeaderStory } from "./stories/channel-header.stories";
import { bookmarksBarStory } from "./stories/bookmarks-bar.stories";
import { workspaceCardStory } from "./stories/workspace-card.stories";
import { huddleButtonStory } from "./stories/huddle-button.stories";
import { appIconStory } from "./stories/app-icon.stories";

export const categories: StoryCategory[] = [
  {
    id: "branding",
    label: "Branding",
    stories: [appIconStory],
  },
  {
    id: "core",
    label: "Core",
    stories: [buttonStory, inputStory, badgeStory],
  },
  {
    id: "data-display",
    label: "Data Display",
    stories: [
      avatarStory,
      daySeparatorStory,
      typingIndicatorStory,
      ephemeralMessageStory,
      linkPreviewStory,
    ],
  },
  {
    id: "overlay",
    label: "Overlay",
    stories: [dialogStory, dropdownMenuStory, tooltipStory],
  },
  {
    id: "form",
    label: "Form",
    stories: [selectStory, switchStory],
  },
  {
    id: "messaging",
    label: "Messaging",
    stories: [
      messageItemStory,
      messageContentStory,
      sharedMessageStory,
      reactionBarStory,
      messageActionBarStory,
    ],
  },
  {
    id: "channel",
    label: "Channel",
    stories: [channelHeaderStory, bookmarksBarStory],
  },
  {
    id: "navigation",
    label: "Navigation",
    stories: [workspaceCardStory, huddleButtonStory],
  },
];
