import { OpenSlaqError } from "./errors";
import { HttpClient } from "./http";
import { Channels } from "./resources/channels";
import { Dms } from "./resources/dms";
import { Files } from "./resources/files";
import { Messages } from "./resources/messages";
import { Search } from "./resources/search";
import { Users } from "./resources/users";

export interface OpenSlaqOptions {
  apiKey: string;
  baseUrl?: string;
  workspaceSlug?: string;
  fetch?: typeof globalThis.fetch;
}

export class OpenSlaq {
  readonly channels: Channels;
  readonly dms: Dms;
  readonly files: Files;
  readonly messages: Messages;
  readonly search: Search;
  readonly users: Users;

  constructor(options: OpenSlaqOptions) {
    if (!options.apiKey || !options.apiKey.startsWith("osk_")) {
      throw new OpenSlaqError("API key must start with 'osk_'");
    }

    const http = new HttpClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? "https://api.openslaq.com",
      workspaceSlug: options.workspaceSlug ?? "default",
      fetch: options.fetch ?? globalThis.fetch,
    });

    this.channels = new Channels(http);
    this.dms = new Dms(http);
    this.files = new Files(http);
    this.messages = new Messages(http);
    this.search = new Search(http);
    this.users = new Users(http);
  }
}
