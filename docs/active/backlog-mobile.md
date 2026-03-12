# Mobile Backlog (Active)

How to use this doc:
- Track mobile features needed to match Slack mobile and our own web app.
- Keep only open or in-progress work here.
- Move completed initiatives to an archive snapshot.

## Tier 1: Web Parity

Backend and shared client-core operations already exist for all of these. Only mobile UI work is needed.

### MM-001: Link Previews
- Status: Done
- Impact: High
- Estimate: Small
- Dependencies: None — API already returns `linkPreviews` on messages
- Summary: Render link preview cards below messages containing URLs.
- Acceptance criteria:
  - Messages with URLs show a preview card with title, description, thumbnail, and favicon.
  - Tapping a preview opens the URL in the system browser.
- Key files: `LinkPreviewCard.tsx`, `MessageBubble.tsx`

### MM-002: Shared Message Display
- Status: Done
- Impact: High
- Estimate: Small
- Dependencies: None — API already returns `sharedMessage` on messages
- Summary: Render forwarded/quoted messages as embedded quote cards.
- Acceptance criteria:
  - Messages with a `sharedMessage` field render a quoted block showing sender, content, channel name, and timestamp.
  - Tapping the quote navigates to the original message.
- Key files: `MessageBubble.tsx`, web ref `SharedMessageBlock.tsx`

### MM-003: Starred Channels
- Status: Done
- Impact: High
- Estimate: Small
- Dependencies: None — `operations/stars.ts` fully built, reducer tracks `starredChannelIds`
- Summary: Let users star channels to pin them at the top of the channel list.
- Acceptance criteria:
  - Star icon toggle on channel rows or channel header.
  - "Starred" section at the top of the channels tab.
  - Star state persists across sessions.
- Key files: `packages/client-core/src/operations/stars.ts`, channel list `index.tsx`

### MM-004: Pinned Messages
- Status: Done
- Impact: High
- Estimate: Small
- Dependencies: None — `operations/pins.ts` fully built
- Summary: View pinned messages per channel and pin/unpin from the action sheet.
- Acceptance criteria:
  - Button in channel header opens a pinned messages list (bottom sheet or screen).
  - Pin/unpin options available in the message action sheet.
  - Pinned messages list updates in real-time.
- Key files: `packages/client-core/src/operations/pins.ts`, `MessageActionSheet.tsx`, web ref `PinnedMessagesPopover.tsx`

### MM-005: Saved Items
- Status: Done
- Impact: Medium
- Estimate: Small
- Dependencies: None — `operations/saved.ts` fully built, reducer tracks `savedMessageIds`
- Summary: Save messages for later reference with a dedicated Saved Items screen.
- Acceptance criteria:
  - "Save" and "Remove from saved" options in the message action sheet.
  - Dedicated Saved Items screen accessible from navigation (tab or drawer).
  - Saved messages grouped by channel with timestamps.
- Key files: `packages/client-core/src/operations/saved.ts`, `MessageActionSheet.tsx`, web ref `SavedItemsView.tsx`

### MM-006: Copy Message Text/Link
- Status: Done
- Impact: Medium
- Estimate: Small
- Dependencies: None — uses `expo-clipboard`
- Summary: Add "Copy text" and "Copy link" to the message action sheet.
- Acceptance criteria:
  - "Copy text" copies the plain-text message content to clipboard.
  - "Copy link" copies a deep link or shareable reference to the message.
  - Confirmation toast shown after copying.
- Key files: `MessageActionSheet.tsx`

### MM-007: Message Sharing
- Status: Done
- Impact: Medium
- Estimate: Small
- Dependencies: None — `operations/share.ts` fully built
- Summary: Forward a message to another channel or DM.
- Acceptance criteria:
  - "Share to channel" option in the message action sheet.
  - Modal with channel/DM picker and optional comment field.
  - Shared message appears as a quoted block in the destination.
- Key files: `packages/client-core/src/operations/share.ts`, `MessageActionSheet.tsx`, web ref `ShareMessageDialog.tsx`

### MM-008: Channel Bookmarks Bar
- Status: Later
- Impact: Medium
- Estimate: Small
- Dependencies: None — `operations/bookmarks.ts` fully built, reducer tracks `channelBookmarks`
- Summary: Show a bookmarks bar below the channel header with pinned links.
- Acceptance criteria:
  - Horizontal scrollable row of bookmark chips below the channel header.
  - Tapping a bookmark opens the URL in the system browser.
  - Add/remove bookmark actions available to members.
- Key files: `packages/client-core/src/operations/bookmarks.ts`, channel screen `[channelId].tsx`, web ref `BookmarksBar.tsx`

### MM-009: All Unreads View
- Status: Done
- Impact: High
- Estimate: Medium
- Dependencies: None — `operations/unreads-view.ts` fully built
- Summary: Dedicated screen showing unread messages across all channels.
- Acceptance criteria:
  - Accessible from navigation (new tab, drawer entry, or header action).
  - Shows unread messages grouped by channel with message previews.
  - "Mark all as read" and per-channel "mark as read" actions.
- Key files: `packages/client-core/src/operations/unreads-view.ts`, tab layout `_layout.tsx`, web ref `AllUnreadsView.tsx`

### MM-010: Group DMs
- Status: Done
- Impact: High
- Estimate: Medium
- Dependencies: None — `operations/group-dm.ts` fully built, reducer tracks `groupDms`
- Summary: Support multi-person DM conversations.
- Acceptance criteria:
  - NewDmModal supports multi-select of users.
  - Group DMs appear in the DMs tab alongside 1-on-1 DMs.
  - Group DM names show comma-separated participant names.
- Key files: `packages/client-core/src/operations/group-dm.ts`, `NewDmModal.tsx`, DM list `index.tsx`

### MM-011: Scheduled Messages
- Status: Done
- Impact: Medium
- Estimate: Medium
- Dependencies: None — `operations/scheduled.ts` fully built
- Summary: Schedule messages for future delivery and manage them.
- Acceptance criteria:
  - Long-press or secondary action on send button opens schedule options.
  - Date/time picker for selecting delivery time.
  - Dedicated screen to view, edit, and cancel scheduled messages.
- Key files: `packages/client-core/src/operations/scheduled.ts`, `MessageInput.tsx`, web ref `ScheduleMessageDialog.tsx`, `ScheduledMessagesView.tsx`

### MM-012: Files Browser
- Status: Done
- Impact: Medium
- Estimate: Medium
- Dependencies: None — `operations/files.ts` fully built with cursor pagination and filters
- Summary: Browse all files shared in the workspace with filtering.
- Acceptance criteria:
  - New screen accessible from navigation.
  - FlatList with file thumbnails/icons, uploader name, date, and source channel.
  - Filter chips for file type (images, documents, videos, etc.).
- Key files: `packages/client-core/src/operations/files.ts`, web ref `FilesView.tsx`

### MM-013: Custom Emoji in Picker
- Status: Done
- Impact: Medium
- Estimate: Medium
- Dependencies: None — `operations/emoji.ts` fully built, reducer tracks `customEmojis`
- Summary: Display workspace custom emoji in the emoji picker and in messages.
- Acceptance criteria:
  - "Custom" section in `EmojiPickerSheet` showing workspace emoji.
  - Custom emoji render correctly in message content and reaction bars.
  - Admin users can upload new custom emoji from settings.
- Key files: `packages/client-core/src/operations/emoji.ts`, `EmojiPickerSheet.tsx`, `MessageBubble.tsx`

### MM-027: Slash Commands
- Status: Done
- Impact: High
- Estimate: Medium
- Dependencies: None — bot/slash-command system fully built on backend
- Summary: Support typing `/` to invoke slash commands in the message input.
- Acceptance criteria:
  - Typing `/` at the start of input shows a list of available commands.
  - Autocomplete filters commands as the user types.
  - Command execution sends to the API and renders ephemeral responses inline.
- Key files: `MessageInput.tsx`, `apps/api/src/bots/`, web ref `SlashCommandMenu.tsx`

### MM-028: Code Syntax Highlighting
- Status: Done
- Impact: Low
- Estimate: Small
- Dependencies: None — messages already render fenced code blocks
- Summary: Add language-aware syntax highlighting to code blocks in messages.
- Acceptance criteria:
  - Fenced code blocks with a language tag render with syntax highlighting.
  - At minimum support JS/TS, Python, JSON, HTML/CSS, Go, Rust.
  - Dark and light theme variants for highlighted code.
- Key files: `CodeBlock.tsx`, web ref uses Shiki

### MM-029: Channel Archiving
- Status: Open
- Impact: Medium
- Estimate: Small
- Dependencies: None — archive/unarchive API endpoints already exist
- Summary: Allow archiving and unarchiving channels from mobile.
- Acceptance criteria:
  - "Archive channel" option in channel settings/details.
  - Archived channels show a visual indicator and disable message input.
  - "Unarchive" option available on archived channels for admins.
- Key files: Channel details screen, web ref channel settings

### MM-030: Per-Channel Notification Levels
- Status: Done
- Impact: Medium
- Estimate: Small
- Dependencies: None — notification preference API already supports per-channel levels
- Summary: Allow setting notification level per channel (all, mentions, nothing).
- Acceptance criteria:
  - Notification level picker in channel details/settings.
  - Options: Default, All messages, Mentions only, Nothing.
  - Push notification delivery respects per-channel settings.
- Key files: Channel details screen, `apps/api/src/push/`

### MM-031: Bot & App Management
- Status: Open
- Impact: Medium
- Estimate: Large
- Dependencies: None — full bot CRUD API exists on backend
- Summary: Create, configure, and manage workspace bots/apps from mobile.
- Acceptance criteria:
  - Bots section in workspace settings listing installed bots.
  - Create new bot with name, avatar, and scope selection.
  - Edit bot configuration, event subscriptions, and slash commands.
  - Delete bot with confirmation.
- Key files: Workspace settings screen, `apps/api/src/bots/`, web ref `BotSettingsPage.tsx`

### MM-032: Screen Sharing in Huddles
- Status: Done
- Impact: Medium
- Estimate: Medium
- Dependencies: LiveKit screen capture support for React Native
- Summary: Share device screen during an active huddle.
- Acceptance criteria:
  - "Share screen" button in huddle controls.
  - Screen capture stream shared via LiveKit to all participants.
  - Visual indicator when a participant is sharing their screen.
  - Tap shared screen to view full-screen.
- Key files: `HuddleControls.tsx`, `VideoGrid.tsx`, `VideoTile.tsx`

## Tier 2: New Mobile Features

Important Slack-like features that improve mobile UX. Some need minor backend work.

### MM-014: Pull to Refresh
- Status: Unnecessary — Socket.IO handles live updates
- Impact: Low
- Estimate: Small
- Dependencies: None — uses React Native's built-in RefreshControl
- Summary: Add pull-to-refresh on key list screens.
- Acceptance criteria:
  - Pull-to-refresh on channel message list re-fetches messages.
  - Pull-to-refresh on channel list and DM list re-fetches data.
  - Standard iOS/Android refresh spinner shown during refresh.
- Key files: Channel screen `[channelId].tsx`, channel list `index.tsx`, DM list `index.tsx`

### MM-015: Mark as Unread
- Status: Done
- Impact: Medium
- Estimate: Small
- Dependencies: None — read position API already exists
- Summary: Mark a message as unread from the action sheet.
- Acceptance criteria:
  - "Mark as unread" option in the message action sheet.
  - Sets channel read position to just before the selected message.
  - Channel shows unread indicator in the sidebar after marking.
- Key files: `MessageActionSheet.tsx`, `apps/api/src/channels/read-positions-service.ts`

### MM-016: Quick Switcher
- Status: Done
- Impact: High
- Estimate: Medium
- Dependencies: None — data already in chat store (channels, dms, groupDms, members)
- Summary: Cmd+K equivalent for quickly jumping to any channel, DM, or member.
- Acceptance criteria:
  - Accessible from a header action or floating button.
  - Search input filters across channels, DMs, group DMs, and members.
  - Results ordered by relevance/recency; tapping navigates immediately.
- Key files: Workspace layout `_layout.tsx`

### MM-017: Image Gallery Viewer
- Status: Done
- Impact: Medium
- Estimate: Medium
- Dependencies: None — images already delivered as message attachments
- Summary: Full-screen image viewer with pinch-to-zoom and swipe navigation.
- Acceptance criteria:
  - Tapping an image attachment opens full-screen viewer.
  - Pinch-to-zoom and double-tap-to-zoom supported.
  - Swipe between images shared in the same conversation.
- Key files: `MessageAttachments.tsx`, consider `react-native-image-viewing` library

### MM-018: Drafts
- Status: Done
- Impact: Medium
- Estimate: Medium
- Dependencies: None — can start with AsyncStorage (client-only)
- Summary: Auto-save and resume message drafts across channels.
- Acceptance criteria:
  - Text in MessageInput auto-saves as a draft when navigating away.
  - Draft restores when returning to the channel.
  - Dedicated Drafts screen lists channels with unsent drafts.
- Key files: `useDraftMessage.ts`, `draft-storage.ts`, `MessageInput.tsx`, `drafts.tsx`, `QuickActionsRow.tsx`

### MM-019: Haptic Feedback
- Status: Done
- Impact: Low
- Estimate: Small
- Dependencies: None — uses `expo-haptics`
- Summary: Add tactile feedback on key interactions.
- Acceptance criteria:
  - Light haptic on message long-press.
  - Medium haptic on send button tap.
  - Light haptic on reaction selection.
- Key files: `MessageBubble.tsx`, `MessageInput.tsx`, `MessageActionSheet.tsx`

## Tier 3: Polish & Extended

Lower priority features for future iterations.

### MM-022: Rich Text Toolbar
- Status: Done
- Impact: Low
- Estimate: Medium
- Dependencies: Markdown shortcut insertion or a rich-text editor library
- Summary: Formatting toolbar above the keyboard for bold, italic, code, and lists.
- Acceptance criteria:
  - Toolbar row with formatting buttons appears above the keyboard.
  - Buttons insert markdown syntax around selected text or at cursor.
  - Preview of formatted text in the input.
- Key files: `MessageInput.tsx`

### MM-023: Huddle Text Chat
- Status: Open
- Impact: Low
- Estimate: Medium
- Dependencies: Huddle-scoped message channel or thread on backend
- Summary: Side text chat panel within an active huddle.
- Acceptance criteria:
  - Collapsible text chat panel in the huddle screen.
  - Messages scoped to the huddle session.
  - Real-time message delivery between huddle participants.
- Key files: Huddle screen `huddle.tsx`, `apps/api/src/socket/index.ts`

### MM-024: Offline Message Queue
- Status: Open
- Impact: Medium
- Estimate: Large
- Dependencies: Network state detection (`@react-native-community/netinfo`), local queue
- Summary: Queue messages when offline and send on reconnect.
- Acceptance criteria:
  - Messages composed offline are queued locally with a "pending" indicator.
  - Queued messages send automatically when connectivity resumes.
  - Failed sends surface an error with retry option.
- Key files: `MessageInput.tsx`, socket provider

### MM-025: Voice Messages
- Status: Done
- Impact: Low
- Estimate: Large
- Dependencies: Audio recording (`expo-av`), new attachment type, audio player UI
- Summary: Record and send audio clips as message attachments.
- Acceptance criteria:
  - Record button in MessageInput for capturing audio.
  - Audio player UI in message bubbles for playback.
  - Backend supports audio file upload and streaming.
- Key files: `useAudioRecorder.ts`, `AudioPlayer.tsx`, `MessageInput.tsx`, `MessageAttachments.tsx`

### MM-026: Message Reminders
- Status: Open
- Impact: Low
- Estimate: Large
- Dependencies: New DB reminders table, background job scheduler, push integration
- Summary: "Remind me about this" with time options on messages.
- Acceptance criteria:
  - "Remind me" option in message action sheet with time presets.
  - Reminder delivered as a push notification at the selected time.
  - Reminders list view to see and manage pending reminders.
- Key files: `MessageActionSheet.tsx`, `apps/api/src/db/schema.ts`
