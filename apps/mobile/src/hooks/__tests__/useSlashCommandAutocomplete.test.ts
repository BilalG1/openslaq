import { renderHook } from "@testing-library/react-native";
import { useSlashCommandAutocomplete } from "../useSlashCommandAutocomplete";
import type { SlashCommandDefinition } from "@openslaq/shared";
import { asBotAppId } from "@openslaq/shared";

const mockCommands: SlashCommandDefinition[] = [
  { name: "remind", description: "Set a reminder", usage: "/remind [time] [message]", source: "builtin" },
  { name: "mute", description: "Mute a channel", usage: "/mute", source: "builtin" },
  { name: "weather", description: "Get weather info", usage: "/weather [city]", source: "bot", botAppId: asBotAppId("app-1"), botName: "WeatherBot" },
];

function renderAutocomplete(text: string, commands = mockCommands) {
  return renderHook(() =>
    useSlashCommandAutocomplete({ text, commands }),
  );
}

describe("useSlashCommandAutocomplete", () => {
  it("is not active when text does not start with /", () => {
    const { result } = renderAutocomplete("hello world");

    expect(result.current.isActive).toBe(false);
    expect(result.current.suggestions).toEqual([]);
  });

  it("activates on / at start of text", () => {
    const { result } = renderAutocomplete("/");

    expect(result.current.isActive).toBe(true);
    expect(result.current.suggestions).toHaveLength(3);
  });

  it("filters commands by name prefix", () => {
    const { result } = renderAutocomplete("/rem");

    expect(result.current.isActive).toBe(true);
    expect(result.current.query).toBe("rem");
    expect(result.current.suggestions).toHaveLength(1);
    expect(result.current.suggestions[0]!.name).toBe("remind");
  });

  it("closes autocomplete once space is typed (command locked in)", () => {
    const { result } = renderAutocomplete("/remind some args");

    expect(result.current.isActive).toBe(false);
    expect(result.current.suggestions).toEqual([]);
  });

  it("does not activate when / is not at position 0", () => {
    const { result } = renderAutocomplete("hello /remind");

    expect(result.current.isActive).toBe(false);
  });

  it("returns empty suggestions for non-matching query", () => {
    const { result } = renderAutocomplete("/xyz");

    expect(result.current.isActive).toBe(true);
    expect(result.current.suggestions).toEqual([]);
  });

  it("limits results to 10", () => {
    const manyCommands = Array.from({ length: 15 }, (_, i) => ({
      name: `cmd${i}`,
      description: `Command ${i}`,
      usage: `/cmd${i}`,
      source: "builtin" as const,
    }));

    const { result } = renderAutocomplete("/cmd", manyCommands);

    expect(result.current.suggestions.length).toBeLessThanOrEqual(10);
  });

  it("insertCommand replaces text with /name and space", () => {
    const { result } = renderAutocomplete("/rem");

    const insertResult = result.current.insertCommand(mockCommands[0]!);

    expect(insertResult.text).toBe("/remind ");
    expect(insertResult.cursorPosition).toBe(8);
  });

  it("insertCommand works with empty query", () => {
    const { result } = renderAutocomplete("/");

    const insertResult = result.current.insertCommand(mockCommands[1]!);

    expect(insertResult.text).toBe("/mute ");
    expect(insertResult.cursorPosition).toBe(6);
  });

  it("is case-insensitive when filtering", () => {
    const { result } = renderAutocomplete("/REM");

    expect(result.current.suggestions).toHaveLength(1);
    expect(result.current.suggestions[0]!.name).toBe("remind");
  });
});
