import { describe, expect, it } from "bun:test";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { createMentionSuggestion } from "./useMentionSuggestion";
import type { MentionSuggestionItem } from "./MentionSuggestion";

function mockStartProps(): SuggestionProps<MentionSuggestionItem> {
  return { items: [], command: () => {}, decorationNode: null } as unknown as SuggestionProps<MentionSuggestionItem>;
}

function mockKeyDown(key: string): SuggestionKeyDownProps {
  return { event: { key } as KeyboardEvent } as unknown as SuggestionKeyDownProps;
}

describe("createMentionSuggestion", () => {
  it("uses latest members from getter in items callback", () => {
    let members = [{ id: "u1", displayName: "Alice" }];

    const suggestion = createMentionSuggestion(() => members);
    const items = suggestion.items!;
    expect(items({ query: "ali", editor: {} as never })).toEqual([{ id: "u1", displayName: "Alice" }]);

    members = [{ id: "u2", displayName: "Bob" }];
    expect(items({ query: "bo", editor: {} as never })).toEqual([{ id: "u2", displayName: "Bob" }]);
  });

  it("Escape removes the container from the DOM", () => {
    const suggestion = createMentionSuggestion(() => []);
    const lifecycle = suggestion.render!();

    lifecycle.onStart!(mockStartProps());

    const containers = document.querySelectorAll("body > div[style]");
    expect(containers.length).toBeGreaterThan(0);

    const result = lifecycle.onKeyDown!(mockKeyDown("Escape"));
    expect(result).toBe(true);

    const remaining = document.querySelectorAll("body > div[style]");
    expect(remaining.length).toBe(0);
  });

  it("sets isActiveRef to true on start and false on exit", () => {
    const isActiveRef = { current: false };
    const suggestion = createMentionSuggestion(() => [], isActiveRef);
    const lifecycle = suggestion.render!();

    expect(isActiveRef.current).toBe(false);

    lifecycle.onStart!(mockStartProps());
    expect(isActiveRef.current).toBe(true);

    lifecycle.onExit!(mockStartProps());
    expect(isActiveRef.current).toBe(false);
  });

  it("onKeyDown returns false when ref is not populated", () => {
    const suggestion = createMentionSuggestion(() => []);
    const lifecycle = suggestion.render!();

    lifecycle.onStart!(mockStartProps());

    // ArrowDown delegates to ref which is null (React ref callback hasn't fired synchronously)
    const result = lifecycle.onKeyDown!(mockKeyDown("ArrowDown"));
    expect(result).toBe(false);

    lifecycle.onExit!(mockStartProps());
  });
});
