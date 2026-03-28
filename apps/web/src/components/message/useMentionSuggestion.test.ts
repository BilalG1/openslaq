import { describe, test, expect } from "vitest";
import {
  createMentionSuggestion,
  type MentionSuggestionItem,
} from "./useMentionSuggestion";

function makeMembers(...names: string[]): MentionSuggestionItem[] {
  return names.map((name, i) => ({
    id: `user-${i}`,
    displayName: name,
  }));
}

function getItems(
  members: MentionSuggestionItem[],
  query: string,
): MentionSuggestionItem[] {
  const suggestion = createMentionSuggestion(() => members);
  // items is a function that takes { query } and returns filtered items
  return suggestion.items!({ query } as never) as MentionSuggestionItem[];
}

describe("createMentionSuggestion", () => {
  test("returns matching members when typing after @", () => {
    const members = makeMembers("Alice", "Bob", "Charlie");
    const results = getItems(members, "ali");

    expect(results.some((r) => r.displayName === "Alice")).toBe(true);
    expect(results.some((r) => r.displayName === "Bob")).toBe(false);
  });

  test("is case-insensitive", () => {
    const members = makeMembers("Alice", "bob");

    for (const query of ["ALICE", "alice", "AlIcE"]) {
      const results = getItems(members, query);
      expect(results.some((r) => r.displayName === "Alice")).toBe(true);
    }

    const bobResults = getItems(members, "BOB");
    expect(bobResults.some((r) => r.displayName === "bob")).toBe(true);
  });

  test("handles partial name matches", () => {
    const members = makeMembers("Alexander", "Alexandra", "Bob");
    const results = getItems(members, "alex");

    const userResults = results.filter((r) => !r.isGroup);
    expect(userResults).toHaveLength(2);
    expect(userResults.some((r) => r.displayName === "Alexander")).toBe(true);
    expect(userResults.some((r) => r.displayName === "Alexandra")).toBe(true);
  });

  test("returns empty when no matches", () => {
    const members = makeMembers("Alice", "Bob");
    const results = getItems(members, "zzz");
    expect(results).toHaveLength(0);
  });

  test("handles empty member list", () => {
    const results = getItems([], "alice");
    expect(results).toHaveLength(0);
  });

  test("includes group mentions (@here, @channel) when query matches", () => {
    const members = makeMembers("Alice");

    const hereResults = getItems(members, "here");
    expect(hereResults.some((r) => r.id === "here" && r.isGroup)).toBe(true);

    const channelResults = getItems(members, "channel");
    expect(channelResults.some((r) => r.id === "channel" && r.isGroup)).toBe(true);
  });

  test("returns both group and user matches for empty query", () => {
    const members = makeMembers("Alice", "Bob");
    const results = getItems(members, "");

    // 2 group mentions + 2 users
    expect(results).toHaveLength(4);
    expect(results.filter((r) => r.isGroup)).toHaveLength(2);
    expect(results.filter((r) => !r.isGroup)).toHaveLength(2);
  });

  test("limits results to 10 items", () => {
    const members = makeMembers(
      ...Array.from({ length: 15 }, (_, i) => `User${i}`),
    );
    const results = getItems(members, "");

    // 2 group mentions + 15 users = 17, capped at 10
    expect(results).toHaveLength(10);
  });

  test("sets isActiveRef on render lifecycle", () => {
    const isActiveRef = { current: false };
    const suggestion = createMentionSuggestion(() => [], isActiveRef);
    const renderer = suggestion.render!();

    // onStart should set isActiveRef to true
    renderer.onStart!({
      items: [],
      command: () => {},
      decorationNode: null,
    } as never);
    expect(isActiveRef.current).toBe(true);

    // onExit should set isActiveRef to false
    renderer.onExit!(null as never);
    expect(isActiveRef.current).toBe(false);
  });
});
