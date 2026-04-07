export type SelectorStrategy = "css" | "testid" | "text" | "role" | "xpath";

export interface CommandResult {
  ok: boolean;
  error?: string;
  data?: unknown;
}
