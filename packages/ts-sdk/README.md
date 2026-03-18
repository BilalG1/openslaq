# openslaq

TypeScript SDK for the [OpenSlaq](https://openslaq.com) API.

## Install

```bash
npm install openslaq
```

## Usage

```typescript
import { OpenSlaq } from "openslaq";

const client = new OpenSlaq({
  apiKey: "osk_your_key_here",
});
```

### Messages

```typescript
// Send a message
const message = await client.messages.send("channel-id", {
  content: "Hello world",
});

// List messages (cursor-based pagination)
const { messages, nextCursor } = await client.messages.list("channel-id", {
  limit: 25,
});

// Reply to a message
await client.messages.reply("channel-id", message.id, {
  content: "Thread reply",
});

// React to a message
await client.messages.toggleReaction(message.id, "👍");
```

### Channels

```typescript
// List channels you're a member of
const channels = await client.channels.list();

// Create a channel
const channel = await client.channels.create({
  name: "engineering",
  description: "Engineering discussion",
});

// Join / leave
await client.channels.join(channel.id);
await client.channels.leave(channel.id);
```

### Direct messages

```typescript
// Open a DM with a user
const { channel } = await client.dms.open("user-id");

// Send a message in the DM
await client.messages.send(channel.id, { content: "Hey!" });
```

### Search

```typescript
const results = await client.search.query({
  q: "deploy",
  channelId: "channel-id", // optional filter
  limit: 20,
});
```

### Files

```typescript
// Upload a file
const { attachments } = await client.files.upload({
  files: new File(["content"], "notes.txt", { type: "text/plain" }),
});

// Send message with attachment
await client.messages.send("channel-id", {
  content: "See attached",
  attachmentIds: [attachments[0].id],
});
```

### Scheduled messages

```typescript
await client.scheduledMessages.create({
  channelId: "channel-id",
  content: "Good morning!",
  scheduledFor: "2026-03-15T09:00:00Z",
});
```

### Error handling

```typescript
import { OpenSlaqApiError } from "openslaq";

try {
  await client.messages.get("bad-id");
} catch (e) {
  if (e instanceof OpenSlaqApiError) {
    console.error(e.status, e.errorMessage);
  }
}
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | *required* | API key (must start with `osk_`) |
| `baseUrl` | `string` | `https://api.openslaq.com` | API base URL |
| `workspaceSlug` | `string` | `default` | Workspace to operate on |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch implementation |

## License

MIT
