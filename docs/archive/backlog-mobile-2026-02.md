# Mobile Backlog (Active)

How to use this doc:
- Track mobile parity and mobile-native UX gaps.
- Keep only open or in-progress items here.
- Move completed work to archive snapshots.

## M-001: Thread Pagination
- Status: Complete
- Impact: Medium
- Owner: Mobile team
- Estimate: Medium
- Dependencies: API pagination behavior for thread replies
- Summary: Add "load more replies" in thread view.
- Acceptance criteria:
  - User can load older replies in pages.
  - Scroll position remains stable when older replies are prepended.

## M-002: Search Experience
- Status: Complete
- Impact: High
- Owner: Mobile team
- Estimate: Medium
- Dependencies: search APIs and result-navigation behavior
- Summary: Deliver full-text search with filters and result navigation.
- Acceptance criteria:
  - Search returns message matches by text.
  - Filters for channel, user, and date range are available.
  - Tapping a result opens the relevant conversation and message context.

## M-003: Huddles on Mobile
- Status: Complete
- Impact: High
- Owner: Mobile + Realtime team
- Estimate: High
- Dependencies: LiveKit/WebRTC integration decisions
- Summary: Support channel and DM huddles on mobile.
- Acceptance criteria:
  - User can start/join/leave huddles in channels and DMs.
  - Core controls work: mute/unmute and camera toggle.
  - Participant state is reflected in real time.

## M-004: Channel Management
- Status: Complete
- Impact: Medium
- Owner: Mobile team
- Estimate: Medium
- Dependencies: create/private/member APIs
- Summary: Add channel creation, private channels, member dialog, and channel search.
- Acceptance criteria:
  - User can create channels from mobile.
  - Private channel creation and visibility rules are enforced.
  - Member list is viewable and manageable from mobile UI.

## M-005: Direct Message Creation
- Status: Complete
- Impact: Medium
- Owner: Mobile team
- Estimate: Low
- Dependencies: user-picker surface
- Summary: Add new DM creation from a user picker.
- Acceptance criteria:
  - User can create a DM from a picker flow.
  - Existing DM channels are reused to avoid duplicates.

## M-006: User Profiles
- Status: Complete
- Impact: Medium
- Owner: Mobile team
- Estimate: Medium
- Dependencies: profile endpoints and edit flows
- Summary: Add profile sidebar/screen and profile editing.
- Acceptance criteria:
  - User can open another member's profile and view role/presence.
  - User can edit own display name and avatar.

## M-007: Workspace Management
- Status: Complete
- Impact: Medium
- Owner: Mobile team
- Estimate: Medium
- Dependencies: workspace create/settings APIs
- Summary: Add create workspace, workspace settings, and workspace switcher.
- Acceptance criteria:
  - User can create a workspace on mobile.
  - User can open workspace settings.
  - User can switch workspaces from mobile navigation.

## M-008: Invitations
- Status: Complete
- Impact: Medium
- Owner: Mobile team
- Estimate: Medium
- Dependencies: invite link generation and acceptance flows
- Summary: Add invite generation and invite acceptance in mobile app.
- Acceptance criteria:
  - Workspace admins can generate invite links.
  - Invite links open and complete acceptance on mobile.

## M-009: Notifications Settings
- Status: Complete
- Impact: Medium
- Owner: Mobile team
- Estimate: Medium
- Dependencies: push permission and preference sync model
- Summary: Add push notification settings and permission handling.
- Acceptance criteria:
  - User can enable/disable push notifications in settings.
  - App handles platform permission states clearly.

## M-010: Mobile Theme Toggle
- Status: Done
- Impact: Low
- Owner: Mobile team
- Estimate: Low
- Dependencies: theme state management in app shell
- Summary: Add manual theme toggle in addition to system theme detection.
- Acceptance criteria:
  - User can explicitly pick light/dark theme.
  - Choice persists across app restarts.
