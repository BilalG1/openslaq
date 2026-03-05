# Refactor Backlog (Active)

How to use this doc:
- Track concrete code-quality refactors identified via codebase analysis.
- Keep only open or in-progress work here.
- Move completed work to archive snapshots.

## R-001: Message Hydration Deduplication
- Status: Done (2026-03-02)
- Impact: High
- Owner: API team
- Estimate: Low
- Dependencies: none
- Summary: The same 9-element `Promise.all` hydration block is copy-pasted 5 times in `apps/api/src/messages/service.ts` (lines ~230, 275, 304, 447, 598). A `hydrateMessages()` function already exists but `getMessages`, `getMessageById`, `getMessagesAround`, and `editMessage` all bypass it and inline the same logic. All call sites should use the shared function.
- Related: E-001 (Message Domain Service Decomposition)
- Acceptance criteria:
  - All message retrieval/edit paths call the shared `hydrateMessages()` function.
  - No duplicated hydration `Promise.all` blocks remain.
  - Existing message API behavior is unchanged.

## R-002: AppLayout God Component Decomposition
- Status: Done (2026-03-02)
- Impact: High
- Owner: Web team
- Estimate: Medium
- Dependencies: none
- Summary: `apps/web/src/components/layout/AppLayout.tsx` was 896 lines handling URL sync, 15+ channel action `useCallback`s, workspace member fetching, huddle actions, and view rendering. Decomposed into 38 focused hooks in `hooks/chat/`, with `useOperationDeps()` for shared deps. Reduced to 597 lines.
- Acceptance criteria:
  - Action handlers are extracted into focused hooks or modules.
  - The `deps` object is constructed once and reused.
  - `workspaceSlug` has a single guard at the top of the component.
  - Component line count is significantly reduced.

## R-003: Group DM N+1 Query Elimination
- Status: Done (2026-03-02)
- Impact: High
- Owner: API team
- Estimate: Low
- Dependencies: none
- Summary: `createGroupDm` in `apps/api/src/group-dm/service.ts` (lines 102–123) fires one query per candidate channel to check membership — should be a single `inArray` query with in-memory grouping (like `dm/service.ts` already does). `listGroupDms` (line 190) also loops `getGroupDmMembers()` per channel.
- Acceptance criteria:
  - `createGroupDm` uses a single batched query for membership checks.
  - `listGroupDms` uses a single batched query for member loading.
  - Behavior and results are unchanged.

## R-004: toChannel() Serializer Deduplication
- Status: Done (2026-03-02)
- Impact: Medium
- Owner: API team
- Estimate: Low
- Dependencies: none
- Summary: The `toChannel()` function is duplicated identically in `apps/api/src/channels/service.ts`, `apps/api/src/dm/service.ts`, and `apps/api/src/group-dm/service.ts` (lines 8–21 each). Should be a single shared export.
- Acceptance criteria:
  - A single `toChannel()` function is exported from one location.
  - `dm/service.ts` and `group-dm/service.ts` import from the shared location.
  - No duplicate definitions remain.

## R-005: Scroll Anchoring Hook Extraction
- Status: Done (2026-03-02)
- Impact: Medium
- Owner: Web team
- Estimate: Low
- Dependencies: none
- Summary: `apps/web/src/components/message/MessageList.tsx` (lines 60–176) and `apps/web/src/components/message/ThreadPanel.tsx` (lines 45–132) contain identical scroll anchoring logic — same ref names, `useLayoutEffect` anchoring, and `IntersectionObserver` sentinel setup. Should be extracted into a `useScrollAnchor()` hook.
- Acceptance criteria:
  - A shared `useScrollAnchor()` hook is used by both `MessageList` and `ThreadPanel`.
  - Scroll behavior (anchoring, infinite scroll, initial scroll) is unchanged.

## R-006: Interface Type Import Cleanup
- Status: Done (2026-03-02)
- Impact: Medium
- Owner: Web team
- Estimate: Low
- Dependencies: none
- Summary: `DmConversation`, `PresenceEntry`, and `GroupDmConversation` interfaces are redefined in `Sidebar.tsx`, `DmList.tsx`, and `StarredList.tsx` instead of importing from `chat-store.tsx` where they are already exported.
- Acceptance criteria:
  - All component-local redefinitions are removed.
  - Components import these types from the canonical source.

## R-007: Service Error Handling Standardization
- Status: Done (2026-03-02)
- Impact: Medium
- Owner: API team
- Estimate: Medium
- Dependencies: none
- Summary: API service functions use two incompatible error patterns — some throw errors (`createMessage` throws `AttachmentLinkError`), others return `{ error: string }` unions (`createGroupDm`, `createThreadReply`, `addGroupDmMember`). Route handlers must use different checking strategies depending on which pattern a service uses. Should standardize on one approach.
- Acceptance criteria:
  - All service functions use the same error signaling pattern.
  - Route handlers use a consistent error-checking approach.
  - No behavior changes for API consumers.

## R-008: Message Type Discriminated Unions
- Status: Done (2026-03-02)
- Impact: Medium
- Owner: Shared types team
- Estimate: Medium
- Dependencies: none
- Summary: The `Message` interface in `packages/shared/src/types/message.ts` (lines 41–66) uses a bag of optionals for bot fields (`isBot`, `botAppId`, `actions`) and huddle fields (`type`, `metadata`). Discriminated unions would provide proper type narrowing and prevent invalid states like a non-bot message with `botAppId` set.
- Acceptance criteria:
  - `Message` type uses discriminated unions for bot and huddle variants.
  - TypeScript correctly narrows message types at usage sites.
  - Serialization in `messages/service.ts` is updated to match.

## R-009: HuddleIndicator Component Extraction
- Status: Done (2026-03-02)
- Impact: Low
- Owner: Web team
- Estimate: Low
- Dependencies: none
- Summary: The huddle-active indicator SVG is inlined identically in `ChannelList.tsx` (line 126) and `DmList.tsx` (lines 146, 191). Should be extracted into a shared `HuddleIndicator` component.
- Acceptance criteria:
  - A shared `HuddleIndicator` component replaces all inline SVG copies.
  - Visual appearance is unchanged.

## R-010: BookmarksBar Favicon Helper
- Status: Done (2026-03-02)
- Impact: Low
- Owner: Web team
- Estimate: Low
- Dependencies: none
- Summary: The Google favicon URL (`https://www.google.com/s2/favicons?domain=...&sz=16`) is constructed twice in `apps/web/src/components/channel/BookmarksBar.tsx` (lines 102, 150). Should be extracted into a small helper.
- Acceptance criteria:
  - A single `getFaviconUrl()` helper is used by both call sites.
  - No duplicated URL construction remains.

## R-011: RichTextEditor getMarkdown Type Fix
- Status: Done (2026-03-02)
- Impact: Low
- Owner: Editor team
- Estimate: Low
- Dependencies: none
- Summary: `apps/web/src/components/message/RichTextEditor.tsx` applies the same `as unknown as { storage: Record<string, unknown> }` cast twice (lines 93, 169). The `getMarkdown` function's type signature should be updated to accept Tiptap's `Editor` type directly.
- Acceptance criteria:
  - `getMarkdown` accepts Tiptap's `Editor` type without casts.
  - Both call sites use `getMarkdown` without `as unknown as` casts.

## R-012: Eager Pinned Messages Fetch Optimization
- Status: Done (2026-03-02)
- Impact: Low
- Owner: Web team
- Estimate: Low
- Dependencies: none
- Summary: `fetchPinnedMessages` is called on every channel change in `AppLayout.tsx` (line 503) just to get `.length` for a badge count. The full pinned message list is fetched eagerly even though the user may never open the pins popover. A lightweight count endpoint or channel metadata field would be more efficient.
- Acceptance criteria:
  - Pin count is available without fetching the full pinned message list.
  - The full list is only fetched when the user opens the pins popover.
