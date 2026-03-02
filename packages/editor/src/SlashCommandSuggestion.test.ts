import { describe, expect, it, mock } from "bun:test";
import { handleSlashCommandKeyDown, type SlashCommandItem } from "./SlashCommandSuggestion";

const items: SlashCommandItem[] = [
  { name: "status", description: "Set your status", usage: "/status :emoji: text", source: "builtin" },
  { name: "mute", description: "Mute this channel", usage: "/mute", source: "builtin" },
  { name: "unmute", description: "Unmute this channel", usage: "/unmute", source: "builtin" },
];

describe("handleSlashCommandKeyDown", () => {
  it("ArrowDown increments selectedIndex wrapping around", () => {
    const setSelectedIndex = mock();
    const command = mock();

    const result = handleSlashCommandKeyDown({ key: "ArrowDown" }, items, 0, setSelectedIndex, command);

    expect(result).toBe(true);
    expect(setSelectedIndex).toHaveBeenCalledTimes(1);
    const updater = setSelectedIndex.mock.calls[0]![0] as (prev: number) => number;
    expect(updater(0)).toBe(1);
    expect(updater(2)).toBe(0); // wraps from last to first
  });

  it("ArrowUp decrements selectedIndex wrapping around", () => {
    const setSelectedIndex = mock();
    const command = mock();

    const result = handleSlashCommandKeyDown({ key: "ArrowUp" }, items, 0, setSelectedIndex, command);

    expect(result).toBe(true);
    expect(setSelectedIndex).toHaveBeenCalledTimes(1);
    const updater = setSelectedIndex.mock.calls[0]![0] as (prev: number) => number;
    expect(updater(0)).toBe(2); // wraps from first to last
    expect(updater(1)).toBe(0);
  });

  it("Enter calls command with the selected item", () => {
    const setSelectedIndex = mock();
    const command = mock();

    const result = handleSlashCommandKeyDown({ key: "Enter" }, items, 1, setSelectedIndex, command);

    expect(result).toBe(true);
    expect(command).toHaveBeenCalledWith(items[1]);
  });

  it("Enter with empty list does not call command", () => {
    const setSelectedIndex = mock();
    const command = mock();

    const result = handleSlashCommandKeyDown({ key: "Enter" }, [], 0, setSelectedIndex, command);

    expect(result).toBe(true);
    expect(command).not.toHaveBeenCalled();
  });

  it("Tab calls command with the selected item", () => {
    const setSelectedIndex = mock();
    const command = mock();

    const result = handleSlashCommandKeyDown({ key: "Tab" }, items, 1, setSelectedIndex, command);

    expect(result).toBe(true);
    expect(command).toHaveBeenCalledWith(items[1]);
  });

  it("Tab with empty list does not call command", () => {
    const setSelectedIndex = mock();
    const command = mock();

    const result = handleSlashCommandKeyDown({ key: "Tab" }, [], 0, setSelectedIndex, command);

    expect(result).toBe(true);
    expect(command).not.toHaveBeenCalled();
  });

  it("unhandled key returns false with no side effects", () => {
    const setSelectedIndex = mock();
    const command = mock();

    const result = handleSlashCommandKeyDown({ key: "a" }, items, 0, setSelectedIndex, command);

    expect(result).toBe(false);
    expect(setSelectedIndex).not.toHaveBeenCalled();
    expect(command).not.toHaveBeenCalled();
  });
});
