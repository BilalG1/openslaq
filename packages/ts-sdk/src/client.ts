import { OpenSlaqError } from "./errors";
import { HttpClient } from "./http";
import { createRpcClient } from "./rpc";
import { Channels } from "./resources/channels";
import { Dms } from "./resources/dms";
import { Files } from "./resources/files";
import { GroupDms } from "./resources/group-dms";
import { Messages } from "./resources/messages";
import { Presence } from "./resources/presence";
import { ScheduledMessages } from "./resources/scheduled-messages";
import { Search } from "./resources/search";
import { Users } from "./resources/users";

export interface OpenSlaqOptions {
  apiKey: string;
  baseUrl?: string;
  workspaceSlug: string;
  fetch?: typeof globalThis.fetch;
}

export class OpenSlaq {
  readonly channels: Channels;
  readonly dms: Dms;
  readonly files: Files;
  readonly groupDms: GroupDms;
  readonly messages: Messages;
  readonly presence: Presence;
  readonly scheduledMessages: ScheduledMessages;
  readonly search: Search;
  readonly users: Users;

  constructor(options: OpenSlaqOptions) {
    if (!options.apiKey || !options.apiKey.startsWith("osk_")) {
      throw new OpenSlaqError("API key must start with 'osk_'");
    }

    const baseUrl = options.baseUrl ?? "https://api.openslaq.com";
    if (!options.workspaceSlug) {
      throw new OpenSlaqError("workspaceSlug is required");
    }
    const slug = options.workspaceSlug;
    const customFetch = options.fetch ?? globalThis.fetch;

    const rpc = createRpcClient(baseUrl, options.apiKey, customFetch);

    // Keep HttpClient for FormData upload and redirect (not covered by Hono RPC)
    const http = new HttpClient({
      apiKey: options.apiKey,
      baseUrl,
      workspaceSlug: slug,
      fetch: customFetch,
    });

    this.channels = new Channels(rpc, slug);
    this.dms = new Dms(rpc, slug);
    this.files = new Files(rpc, slug, http);
    this.groupDms = new GroupDms(rpc, slug);
    this.messages = new Messages(rpc, slug);
    this.presence = new Presence(rpc, slug);
    this.scheduledMessages = new ScheduledMessages(rpc, slug);
    this.search = new Search(rpc, slug);
    this.users = new Users(rpc);
  }
}
