import { renderHook, act } from "@testing-library/react-native";
import { useMessageSuggestions } from "../useMessageSuggestions";
import type { SlashCommandDefinition } from "@openslaq/shared";

const members = [
  { id: "u1", displayName: "Alice Anderson" },
  { id: "u2", displayName: "Bob Brown" },
  { id: "u3", displayName: "Charlie Chen" },
];

const slashCommands: SlashCommandDefinition[] = [
  { name: "giphy", description: "Search GIFs", usage: "/giphy [query]", source: "builtin" },
  { name: "remind", description: "Set a reminder", usage: "/remind", source: "builtin" },
];

describe("useMessageSuggestions", () => {
  it("returns empty suggestions initially", () => {
    const { result } = renderHook(() =>
      useMessageSuggestions({ members, slashCommands }),
    );
    expect(result.current.mentionSuggestions).toEqual([]);
    expect(result.current.slashSuggestions).toEqual([]);
  });

  it("returns mention suggestions when mentionQuery is set", () => {
    const { result } = renderHook(() =>
      useMessageSuggestions({ members, slashCommands }),
    );
    act(() => {
      result.current.setMentionQuery("ali");
    });
    expect(result.current.mentionSuggestions).toHaveLength(1);
    expect(result.current.mentionSuggestions[0]!.id).toBe("u1");
  });

  it("returns slash suggestions when slashQuery is set", () => {
    const { result } = renderHook(() =>
      useMessageSuggestions({ members, slashCommands }),
    );
    act(() => {
      result.current.setSlashQuery("gi");
    });
    expect(result.current.slashSuggestions).toHaveLength(1);
    expect(result.current.slashSuggestions[0]!.name).toBe("giphy");
  });

  it("clearSuggestions resets both queries", () => {
    const { result } = renderHook(() =>
      useMessageSuggestions({ members, slashCommands }),
    );
    act(() => {
      result.current.setMentionQuery("a");
      result.current.setSlashQuery("g");
    });
    expect(result.current.mentionSuggestions.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearSuggestions();
    });
    expect(result.current.mentionSuggestions).toEqual([]);
    expect(result.current.slashSuggestions).toEqual([]);
    expect(result.current.mentionQuery).toBeNull();
    expect(result.current.slashQuery).toBeNull();
  });

  it("updates suggestions when members change", () => {
    const { result, rerender } = renderHook(
      ({ members: m }) => useMessageSuggestions({ members: m, slashCommands }),
      { initialProps: { members } },
    );
    act(() => {
      result.current.setMentionQuery("alice");
    });
    expect(result.current.mentionSuggestions).toHaveLength(1);

    rerender({ members: [] });
    expect(result.current.mentionSuggestions).toEqual([]);
  });

  it("returns all members for empty query string", () => {
    const { result } = renderHook(() =>
      useMessageSuggestions({ members, slashCommands }),
    );
    act(() => {
      result.current.setMentionQuery("");
    });
    expect(result.current.mentionSuggestions).toHaveLength(3);
  });
});
