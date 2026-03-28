# Mobile QA Bugs

Bugs found during mobile QA testing on 2026-03-24.

## Private Channel Visibility Bugs

### Bug 1: Channel header shows `#` instead of lock icon for private channels
- **Severity**: Medium
- **Steps**: Create a private channel, navigate into it
- **Expected**: Header should show a lock icon (🔒) before channel name
- **Actual**: Header shows `# channel-name` with hash prefix, same as public channels
- **Also affects**: Long-press action sheet header
- **Screenshots**: `apps/mobile/e2e/test-results/step5-after-create.png`, `step7-in-channel.png`

### Bug 2: Private channel appears in Browse Channels list
- **Severity**: High
- **Steps**: Create a private channel, then open Browse Channels
- **Expected**: Private channels should NOT appear in the public browse list
- **Actual**: Private channel appears in Browse Channels alongside public channels
- **Impact**: Other users who aren't members could discover private channels, defeating the purpose of privacy
- **Screenshot**: `apps/mobile/e2e/test-results/step12-browse-channels.png`

### Bug 3: Browse Channels shows `#` prefix for private channels
- **Severity**: Low (dependent on Bug 2)
- **Steps**: Open Browse Channels with a private channel present
- **Expected**: Private channels (if shown) should have lock icon prefix
- **Actual**: Shows `# channel-name` with hash prefix
- **Screenshot**: `apps/mobile/e2e/test-results/step12-browse-channels.png`

## Notification Settings Bugs

### Bug 4: Channel Info "Notifications" button opens sheet behind the panel
- **Severity**: Medium
- **Steps**: Open a channel > tap channel header to open Channel Info > tap "Notifications" (bell icon)
- **Expected**: Notification level sheet opens visibly
- **Actual**: NotificationLevelSheet opens behind the ChannelInfoPanel because `onNotificationPress` dispatches `showNotificationSheet` without first closing channel info. Both sheets render simultaneously with channel info on top.
- **Root cause**: In `apps/mobile/app/(app)/[workspaceSlug]/(tabs)/(channels)/[channelId].tsx:701`, `onNotificationPress` needs to also dispatch `closeChannelInfo`
- **Screenshot**: `apps/mobile/e2e/test-results/notif-13-after-notif-tap.png`

## User Profile / Status Bugs

### Bug 5: No "Set Status" accessible from Settings page
- **Severity**: Medium (UX gap)
- **Steps**: Tap header avatar to open Settings
- **Expected**: Settings page should show current status and allow setting/editing it directly
- **Actual**: Status is only accessible via channel members list > tap yourself > profile page. Settings page has no status display or shortcut.
- **Screenshot**: `apps/mobile/e2e/test-results/step15-settings-with-status.png`

### Bug 6: Status not visible on home screen
- **Severity**: Low (UX gap)
- **Steps**: Set a status, return to home screen
- **Expected**: Status emoji should appear next to avatar in header and in DM rows
- **Actual**: Status is not displayed anywhere on the home screen
- **Screenshot**: `apps/mobile/e2e/test-results/step14-home-with-status.png`

## Channel Info Bugs

### Bug 7: Channel header title button not hittable by Detox
- **Severity**: Low (testability issue)
- **Steps**: Try to tap `channel-title-button` in Detox
- **Expected**: Button should be tappable
- **Actual**: Detox reports "View is not hittable at its visible point" — the custom `headerTitle` Pressable's bounds `{{0, 0}, {110, 44}}` extend outside the visible nav bar area `{{0, 47}, {390, 54}}`
- **Impact**: Automated tests cannot tap the channel header to open info panel. Requires IDB coordinate tap workaround.

## QA Coverage Summary

All other tested flows passed with no bugs:

- **Messages**: Send (channel + DM), edit, delete, threads, reactions
- **Channels**: Create, browse, join, leave, archive, unarchive
- **Settings**: Workspace settings (members, invites, danger zone), preferences (theme/dark mode), More tab sub-screens, notification toggles, per-channel notification levels, display name editing
- **Navigation**: Tab switching (Home, DMs, Activity, More), quick actions (Threads, Huddles, Later, Outbox), search modal
- **DMs**: Open existing DM, send messages, new DM modal
- **Search**: Message search, result navigation, recent searches, empty states, cancel
- **Channel Info**: Members list, topic editing, pinned messages, member/pin counts
