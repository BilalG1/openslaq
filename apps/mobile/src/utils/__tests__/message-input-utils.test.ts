import {
  filterMentionSuggestions,
  filterSlashSuggestions,
  parseSlashCommand,
} from "../message-input-utils";
import type { SlashCommandDefinition } from "@openslaq/shared";

// --------------- filterMentionSuggestions ---------------

describe("filterMentionSuggestions", () => {
  const members = [
    { id: "u1", displayName: "Alice Anderson" },
    { id: "u2", displayName: "Bob Brown" },
    { id: "u3", displayName: "Charlie Chen" },
    { id: "u4", displayName: "Alicia Gomez" },
  ];

  it("returns empty array when query is null", () => {
    expect(filterMentionSuggestions(members, null)).toEqual([]);
  });

  it("returns all members for empty query", () => {
    expect(filterMentionSuggestions(members, "")).toEqual(members);
  });

  it("filters by substring match (case-insensitive)", () => {
    const result = filterMentionSuggestions(members, "ali");
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual(["u1", "u4"]);
  });

  it("limits results to 10", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `u${i}`,
      displayName: `User ${i}`,
    }));
    expect(filterMentionSuggestions(many, "user")).toHaveLength(10);
  });

  it("returns empty when no match", () => {
    expect(filterMentionSuggestions(members, "xyz")).toEqual([]);
  });
});

// --------------- filterSlashSuggestions ---------------

describe("filterSlashSuggestions", () => {
  const commands: SlashCommandDefinition[] = [
    { name: "giphy", description: "Search GIFs", usage: "/giphy [query]", source: "builtin" },
    { name: "remind", description: "Set a reminder", usage: "/remind [text] [time]", source: "builtin" },
    { name: "gif", description: "Random GIF", usage: "/gif", source: "builtin" },
    { name: "mute", description: "Mute channel", usage: "/mute", source: "builtin" },
  ];

  it("returns empty array when query is null", () => {
    expect(filterSlashSuggestions(commands, null)).toEqual([]);
  });

  it("returns all commands for empty query", () => {
    expect(filterSlashSuggestions(commands, "")).toEqual(commands);
  });

  it("filters by prefix match (case-insensitive)", () => {
    const result = filterSlashSuggestions(commands, "gi");
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name)).toEqual(["giphy", "gif"]);
  });

  it("uses prefix, not substring", () => {
    // "iphy" should not match "giphy"
    expect(filterSlashSuggestions(commands, "iphy")).toEqual([]);
  });

  it("limits results to 10", () => {
    const many: SlashCommandDefinition[] = Array.from({ length: 20 }, (_, i) => ({
      name: `cmd${i}`,
      description: `Command ${i}`,
      usage: `/cmd${i}`,
      source: "builtin" as const,
    }));
    expect(filterSlashSuggestions(many, "cmd")).toHaveLength(10);
  });
});

// --------------- parseSlashCommand ---------------

describe("parseSlashCommand", () => {
  it("returns null for non-slash text", () => {
    expect(parseSlashCommand("hello")).toBeNull();
  });

  it("parses command without args", () => {
    expect(parseSlashCommand("/giphy")).toEqual({ command: "giphy", args: "" });
  });

  it("parses command with args", () => {
    expect(parseSlashCommand("/remind me to eat in 30m")).toEqual({
      command: "remind",
      args: "me to eat in 30m",
    });
  });

  it("trims whitespace from args", () => {
    expect(parseSlashCommand("/giphy   cats  ")).toEqual({
      command: "giphy",
      args: "cats",
    });
  });

  it("handles slash with no command name", () => {
    expect(parseSlashCommand("/")).toEqual({ command: "", args: "" });
  });

  it("handles slash with space but no args", () => {
    expect(parseSlashCommand("/giphy ")).toEqual({ command: "giphy", args: "" });
  });
});
