# Slaq Parity Backlog (Active)

How to use this doc:
- Track features needed to match core Slaq behavior.
- Keep only open or in-progress work here.
- Move completed initiatives to an archive snapshot.

## High Impact

### SP-001: Channel Topic / Description
- Status: Complete
- Impact: High
- Owner: —
- Estimate: Low
- Dependencies: None (DB `description` field already exists on channels)
- Summary: Display and edit a channel topic/description in the channel header bar.
- Acceptance criteria:
  - Channel topic is visible in the header below the channel name.
  - Users with appropriate permissions can edit the topic inline or via a dialog.
  - Topic changes are broadcast in real-time to other channel members.

### SP-002: Pinned Messages
- Status: Complete
- Impact: High
- Owner: —
- Estimate: Medium
- Dependencies: New DB schema, API routes, UI components
- Summary: Let users pin important messages to a channel for easy reference.
- Acceptance criteria:
  - Users can pin/unpin messages from the message action menu.
  - A "Pinned messages" panel or popover shows all pins for the current channel.
  - Pin/unpin events are broadcast in real-time.

### SP-003: User Custom Status
- Status: Complete
- Impact: High
- Owner: —
- Estimate: Medium
- Dependencies: New DB columns on users table, API route, UI throughout app
- Summary: Let users set a status emoji and text (e.g. "In a meeting", "On vacation") shown next to their name.
- Acceptance criteria:
  - Users can set/clear a status emoji and text from their profile or a quick menu.
  - Status is displayed next to the user's name in the sidebar, message list, and profile panel.
  - Optional expiration time for auto-clearing status.

### SP-004: Starred / Favorited Channels
- Status: Complete
- Impact: High
- Owner: —
- Estimate: Low
- Dependencies: New DB table or column, API route, sidebar UI
- Summary: Let users star channels to pin them at the top of the sidebar.
- Acceptance criteria:
  - Users can star/unstar channels and DMs.
  - Starred items appear in a dedicated "Starred" section at the top of the sidebar.
  - Star state persists across sessions.

### SP-005: Channel Archiving
- Status: Complete
- Impact: High
- Owner: —
- Estimate: Medium
- Dependencies: Schema change (archived flag), API routes, UI gating
- Summary: Let workspace admins archive channels that are no longer active.
- Acceptance criteria:
  - Admins/owners can archive a channel from channel settings.
  - Archived channels are read-only and hidden from the default channel list.
  - Archived channels remain searchable and browsable via a filter.

### SP-006: Group DMs (Multi-Person)
- Status: Complete
- Impact: High
- Owner: —
- Estimate: High
- Dependencies: DM creation flow changes, channel member logic updates, UI changes
- Summary: Support DM conversations with more than two participants.
- Acceptance criteria:
  - Users can create a DM with 2+ people from the new DM dialog.
  - Group DM names show all participant names (or truncated list).
  - Adding/removing members from a group DM is supported.

### SP-007: All Unreads View
- Status: Complete
- Impact: High
- Owner: —
- Estimate: Medium
- Dependencies: Unread tracking infrastructure (already exists), new page/component
- Summary: A dedicated view showing all unread messages across channels in one place.
- Acceptance criteria:
  - Accessible from the sidebar (e.g. "All Unreads" link).
  - Shows unread messages grouped by channel with message previews.
  - "Mark all as read" action available.

### SP-008: Mark as Unread
- Status: Complete
- Impact: High
- Owner: —
- Estimate: Low
- Dependencies: Read position API changes
- Summary: Let users mark a message as unread to come back to it later.
- Acceptance criteria:
  - "Mark as unread" option in the message action menu.
  - Sets the channel read position to just before the selected message.
  - Channel shows as unread in the sidebar after marking.

### SP-009: Per-Channel Notification Preferences
- Status: Complete
- Impact: High
- Owner: —
- Estimate: Medium
- Dependencies: New DB table, API routes, notification logic changes
- Summary: Let users mute channels or choose notification levels per channel.
- Acceptance criteria:
  - Users can set per-channel preference: all messages, mentions only, or nothing (mute).
  - Muted channels show a mute icon in the sidebar.
  - Notification delivery respects per-channel settings.

### SP-010: Link Previews / URL Unfurling
- Status: Complete
- Impact: High
- Owner: —
- Estimate: High
- Dependencies: Server-side URL fetching, metadata extraction, caching
- Summary: Show rich previews for URLs shared in messages (title, description, image).
- Acceptance criteria:
  - URLs in messages automatically show a preview card below the message.
  - Preview includes page title, description, and thumbnail image when available.
  - Previews are generated server-side and cached.

## Medium Impact

### SP-011: Saved / Bookmarked Messages
- Status: Complete
- Impact: Medium
- Owner: —
- Estimate: Medium
- Dependencies: New DB table, API routes, UI panel
- Summary: Let users save messages for later reference across channels.
- Acceptance criteria:
  - "Save for later" option in the message action menu.
  - Dedicated "Saved Items" view accessible from the sidebar.
  - Users can unsave messages.

### SP-012: Scheduled Messages
- Status: Complete
- Impact: Medium
- Owner: —
- Estimate: Medium
- Dependencies: New DB table, background job/scheduler, message input UI
- Summary: Let users schedule messages to be sent at a future time.
- Acceptance criteria:
  - "Schedule message" option available from the send button.
  - Users can pick a date and time for delivery.
  - Scheduled messages can be viewed, edited, or cancelled before sending.

### SP-013: Message Forwarding / Sharing
- Status: Complete
- Impact: Medium
- Owner: —
- Estimate: Low
- Dependencies: Channel/DM picker UI, message creation API
- Summary: Let users share a message to another channel or DM.
- Acceptance criteria:
  - "Share to channel" option in the message action menu.
  - Users pick a destination channel or DM.
  - Shared message appears as a quoted/linked block in the destination.

### SP-014: File Browser
- Status: Complete
- Impact: Medium
- Owner: —
- Estimate: Medium
- Dependencies: Attachments API query endpoint, new UI page/panel
- Summary: Browse all files shared in the workspace or a specific channel.
- Acceptance criteria:
  - Accessible from the sidebar or channel details.
  - Shows files with preview thumbnails, uploader, date, and source channel.
  - Supports filtering by file type and channel.

### SP-015: Sidebar Sections / Custom Categories
- Status: Later
- Impact: Medium
- Owner: —
- Estimate: Medium
- Dependencies: New DB table for user sidebar preferences, drag-and-drop UI
- Summary: Let users organize sidebar channels into custom collapsible sections.
- Acceptance criteria:
  - Users can create named sections and drag channels into them.
  - Sections are collapsible and persist across sessions.
  - Default sections (Starred, Channels, DMs) remain available.

### SP-016: Channel Bookmarks Bar
- Status: Complete
- Impact: Medium
- Owner: —
- Estimate: Medium
- Dependencies: New DB table, API routes, UI bar below channel header
- Summary: A bookmarks bar below the channel topic for pinning links and documents.
- Acceptance criteria:
  - Users can add/remove bookmarks (URL + title) to a channel.
  - Bookmarks bar is visible below the channel header.
  - Clicking a bookmark opens the link in a new tab.

### SP-017: Custom Emoji
- Status: Complete
- Impact: Medium
- Owner: —
- Estimate: Medium
- Dependencies: New DB table, upload endpoint, emoji picker integration
- Summary: Let workspace members upload custom emoji for use in messages and reactions.
- Acceptance criteria:
  - Admins can upload custom emoji with a name and image.
  - Custom emoji appear in the emoji picker alongside standard emoji.
  - Custom emoji work in both messages and reactions.

### SP-018: Slash Commands
- Status: Complete
- Impact: Medium
- Owner: —
- Estimate: High
- Dependencies: Command parser, built-in command handlers, bot platform integration
- Summary: Support slash commands like `/remind`, `/status`, `/invite` in the message input.
- Acceptance criteria:
  - Typing `/` in the message input shows a command autocomplete menu.
  - Built-in commands for common actions (status, remind, invite).
  - Bot platform can register custom slash commands.
