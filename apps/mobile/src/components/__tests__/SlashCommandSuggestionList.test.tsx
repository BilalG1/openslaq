import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { SlashCommandSuggestionList } from "../SlashCommandSuggestionList";
import type { SlashCommandDefinition } from "@openslaq/shared";
import { asBotAppId } from "@openslaq/shared";

const mockCommands: SlashCommandDefinition[] = [
  { name: "remind", description: "Set a reminder", usage: "/remind [time] [message]", source: "builtin" },
  { name: "weather", description: "Get weather info", usage: "/weather [city]", source: "bot", botAppId: asBotAppId("app-1"), botName: "WeatherBot" },
];

describe("SlashCommandSuggestionList", () => {
  it("renders nothing when suggestions are empty", () => {
    render(
      <SlashCommandSuggestionList suggestions={[]} onSelect={jest.fn()} />,
    );

    expect(screen.queryByTestId("slash-command-suggestion-list")).toBeNull();
  });

  it("renders suggestion items", () => {
    render(
      <SlashCommandSuggestionList suggestions={mockCommands} onSelect={jest.fn()} />,
    );

    expect(screen.getByTestId("slash-command-suggestion-list")).toBeTruthy();
    expect(screen.getByTestId("slash-command-remind")).toBeTruthy();
    expect(screen.getByTestId("slash-command-weather")).toBeTruthy();
    expect(screen.getByText("/remind")).toBeTruthy();
    expect(screen.getByText("Set a reminder")).toBeTruthy();
  });

  it("calls onSelect when suggestion is tapped", () => {
    const onSelect = jest.fn();
    render(
      <SlashCommandSuggestionList suggestions={mockCommands} onSelect={onSelect} />,
    );

    fireEvent.press(screen.getByTestId("slash-command-remind"));

    expect(onSelect).toHaveBeenCalledWith(mockCommands[0]);
  });

  it("shows bot badge for bot commands", () => {
    render(
      <SlashCommandSuggestionList suggestions={mockCommands} onSelect={jest.fn()} />,
    );

    expect(screen.getByTestId("slash-command-bot-badge-weather")).toBeTruthy();
    expect(screen.getByText("WeatherBot")).toBeTruthy();
    expect(screen.queryByTestId("slash-command-bot-badge-remind")).toBeNull();
  });

  it("shows description for each command", () => {
    render(
      <SlashCommandSuggestionList suggestions={mockCommands} onSelect={jest.fn()} />,
    );

    expect(screen.getByText("Set a reminder")).toBeTruthy();
    expect(screen.getByText("Get weather info")).toBeTruthy();
  });
});
