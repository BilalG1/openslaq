# TypeScript SDK Backlog

Current state: the SDK (`packages/ts-sdk`) only covers **Messages** (send, list, get, edit, delete, reply, listReplies). Everything below is missing.

## Tier 1 — Essential

- [x] **Channels** — list, create, browse public, join, leave, list members, add/remove members, update (description/topic), archive/unarchive, star/unstar, mark read/unread, notification preferences
- [x] **Reactions** — toggle emoji reaction on a message
- [x] **Users** — get current user profile, update profile (name/avatar), set/clear status

## Tier 2 — Expected for integrations

- [x] **DMs** — open DM channel, list DM channels
- [x] **Search** — full-text message search with filters
- [x] **Files** — upload files (FormData), get download URL (redirect), browse files
- [x] **Pins** — pin/unpin message, list pinned messages, get pin count

## Tier 3 — Bot developer features

- [ ] **Bot API client** — separate client authenticating with bot token, using bot-specific endpoints (send as bot, read channels, list members, get user info, add reactions)
- [ ] **Slash commands** — list available commands, execute commands
- [ ] **Bot management** — create/update/delete bots, toggle enabled, regenerate token, register/delete bot commands

## Tier 4 — Nice to have

- [ ] **Presence** — get online users in workspace
- [ ] **Custom emoji** — list, upload, delete
- [ ] **Channel bookmarks** — list, add, remove
- [x] **Saved messages** — save/unsave, list saved items, list saved IDs, share message, get messages around
- [x] **Scheduled messages** — create, list, get, update, delete, count by channel
- [ ] **Workspaces** — list, create, delete, member management
- [ ] **API keys** — CRUD for API keys
- [ ] **Marketplace** — browse listings, install/uninstall bots
- [ ] **Invites** — workspace invitations
- [ ] **Push notifications** — register/unregister tokens, notification preferences
- [ ] **Huddles** — join huddle (get LiveKit token)
