import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { EmojiPickerSheet } from "../EmojiPickerSheet";
import type { CustomEmoji } from "@openslaq/shared";
import { asEmojiId, asWorkspaceId, asUserId } from "@openslaq/shared";

jest.mock("rn-emoji-keyboard", () => {
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({
      open,
      onEmojiSelected,
      onClose,
    }: {
      open: boolean;
      onEmojiSelected: (e: { emoji: string }) => void;
      onClose: () => void;
    }) => {
      if (!open) return null;
      return (
        <View testID="emoji-picker">
          <Text
            testID="emoji-pick-thumbsup"
            onPress={() => onEmojiSelected({ emoji: "👍" })}
          >
            👍
          </Text>
          <Text testID="emoji-close" onPress={() => onClose()}>
            Close
          </Text>
        </View>
      );
    },
  };
});

const makeCustomEmoji = (name: string): CustomEmoji => ({
  id: asEmojiId(`emoji-${name}`),
  workspaceId: asWorkspaceId("ws-1"),
  name,
  url: `https://cdn.test/${name}.png`,
  uploadedBy: asUserId("user-1"),
  createdAt: "2025-01-01T00:00:00Z",
});

describe("EmojiPickerSheet", () => {
  it("renders when visible", () => {
    const { getByTestId } = render(
      <EmojiPickerSheet visible onSelect={jest.fn()} onClose={jest.fn()} />,
    );

    expect(getByTestId("emoji-picker")).toBeTruthy();
  });

  it("does not render when not visible", () => {
    const { queryByTestId } = render(
      <EmojiPickerSheet visible={false} onSelect={jest.fn()} onClose={jest.fn()} />,
    );

    expect(queryByTestId("emoji-picker")).toBeNull();
  });

  it("calls onSelect with emoji string and onClose", () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    const { getByTestId } = render(
      <EmojiPickerSheet visible onSelect={onSelect} onClose={onClose} />,
    );

    fireEvent.press(getByTestId("emoji-pick-thumbsup"));

    expect(onSelect).toHaveBeenCalledWith("👍");
    expect(onClose).toHaveBeenCalled();
  });

  it("triggers light haptic on emoji selection", () => {
    const { impactAsync, ImpactFeedbackStyle } = require("expo-haptics");
    const onSelect = jest.fn();

    const { getByTestId } = render(
      <EmojiPickerSheet visible onSelect={onSelect} onClose={jest.fn()} />,
    );

    fireEvent.press(getByTestId("emoji-pick-thumbsup"));

    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
  });

  it("shows custom emoji tab when customEmojis provided", () => {
    const customEmojis = [makeCustomEmoji("party-parrot"), makeCustomEmoji("pepe")];

    const { getByTestId } = render(
      <EmojiPickerSheet
        visible
        onSelect={jest.fn()}
        onClose={jest.fn()}
        customEmojis={customEmojis}
      />,
    );

    expect(getByTestId("custom-emoji-tab")).toBeTruthy();
  });

  it("does not show custom emoji tab when customEmojis is empty", () => {
    const { queryByTestId } = render(
      <EmojiPickerSheet
        visible
        onSelect={jest.fn()}
        onClose={jest.fn()}
        customEmojis={[]}
      />,
    );

    expect(queryByTestId("custom-emoji-tab")).toBeNull();
  });

  it("shows custom emoji section when tab is tapped", () => {
    const customEmojis = [makeCustomEmoji("party-parrot"), makeCustomEmoji("pepe")];

    const { getByTestId } = render(
      <EmojiPickerSheet
        visible
        onSelect={jest.fn()}
        onClose={jest.fn()}
        customEmojis={customEmojis}
      />,
    );

    fireEvent.press(getByTestId("custom-emoji-tab"));

    expect(getByTestId("custom-emoji-section")).toBeTruthy();
    expect(getByTestId("custom-emoji-party-parrot")).toBeTruthy();
    expect(getByTestId("custom-emoji-pepe")).toBeTruthy();
  });

  it("calls onSelect with :custom:name: format when custom emoji tapped", () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const customEmojis = [makeCustomEmoji("party-parrot")];

    const { getByTestId } = render(
      <EmojiPickerSheet
        visible
        onSelect={onSelect}
        onClose={onClose}
        customEmojis={customEmojis}
      />,
    );

    // Open custom section first
    fireEvent.press(getByTestId("custom-emoji-tab"));
    fireEvent.press(getByTestId("custom-emoji-party-parrot"));

    expect(onSelect).toHaveBeenCalledWith(":custom:party-parrot:");
    expect(onClose).toHaveBeenCalled();
  });

  it("can go back to standard picker from custom section", () => {
    const customEmojis = [makeCustomEmoji("party-parrot")];

    const { getByTestId, queryByTestId } = render(
      <EmojiPickerSheet
        visible
        onSelect={jest.fn()}
        onClose={jest.fn()}
        customEmojis={customEmojis}
      />,
    );

    fireEvent.press(getByTestId("custom-emoji-tab"));
    expect(getByTestId("custom-emoji-section")).toBeTruthy();

    fireEvent.press(getByTestId("custom-emoji-back"));
    expect(queryByTestId("custom-emoji-section")).toBeNull();
    expect(getByTestId("emoji-picker")).toBeTruthy();
  });
});
