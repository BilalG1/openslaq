import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { HeaderAvatarButton } from "../HeaderAvatarButton";

describe("HeaderAvatarButton", () => {
  it("renders initials when no avatar URL is provided", () => {
    render(
      <HeaderAvatarButton displayName="Alice Smith" onPress={jest.fn()} />,
    );

    expect(screen.getByTestId("header-avatar-initials")).toBeTruthy();
    expect(screen.getByText("AS")).toBeTruthy();
  });

  it("renders single initial for single-word name", () => {
    render(
      <HeaderAvatarButton displayName="Bob" onPress={jest.fn()} />,
    );

    expect(screen.getByText("B")).toBeTruthy();
  });

  it('renders "?" when no display name', () => {
    render(
      <HeaderAvatarButton onPress={jest.fn()} />,
    );

    expect(screen.getByText("?")).toBeTruthy();
  });

  it("fires onPress when tapped", () => {
    const onPress = jest.fn();
    render(
      <HeaderAvatarButton displayName="Alice" onPress={onPress} />,
    );

    fireEvent.press(screen.getByTestId("header-avatar-button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders status emoji badge when statusEmoji is provided", () => {
    render(
      <HeaderAvatarButton displayName="Alice" onPress={jest.fn()} statusEmoji="🎉" />,
    );

    expect(screen.getByTestId("header-avatar-status-emoji")).toBeTruthy();
    expect(screen.getByText("🎉")).toBeTruthy();
  });

  it("does not render status emoji badge when statusEmoji is not provided", () => {
    render(
      <HeaderAvatarButton displayName="Alice" onPress={jest.fn()} />,
    );

    expect(screen.queryByTestId("header-avatar-status-emoji")).toBeNull();
  });

  it("renders image when avatarUrl is provided", () => {
    render(
      <HeaderAvatarButton
        avatarUrl="https://example.com/avatar.jpg"
        displayName="Alice"
        onPress={jest.fn()}
      />,
    );

    // When avatarUrl is set, initials should not be rendered
    expect(screen.queryByTestId("header-avatar-initials")).toBeNull();
    expect(screen.getByTestId("header-avatar-button")).toBeTruthy();
  });
});
