import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { HuddleHeaderButton } from "../huddle/HuddleHeaderButton";

const mockJoinHuddle = jest.fn();

jest.mock("@/contexts/HuddleProvider", () => ({
  useHuddle: () => ({
    joinHuddle: mockJoinHuddle,
  }),
}));

let mockHuddleForChannel = {
  activeHuddle: null as null | { participants: Array<{ userId: string }> },
  isUserInHuddle: false,
};

jest.mock("@/hooks/useHuddleForChannel", () => ({
  useHuddleForChannel: () => mockHuddleForChannel,
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      brand: { primary: "#1264a3" },
      colors: { textPrimary: "#000" },
    },
  }),
}));

describe("HuddleHeaderButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHuddleForChannel = {
      activeHuddle: null,
      isUserInHuddle: false,
    };
  });

  it("renders start button when no active huddle", () => {
    render(<HuddleHeaderButton channelId="ch-1" />);

    expect(screen.getByTestId("huddle-start-button")).toBeTruthy();
  });

  it("calls joinHuddle when start button is pressed", () => {
    render(<HuddleHeaderButton channelId="ch-1" />);

    fireEvent.press(screen.getByTestId("huddle-start-button"));
    expect(mockJoinHuddle).toHaveBeenCalledWith("ch-1");
  });

  it("renders join button when active huddle exists but user is not in it", () => {
    mockHuddleForChannel = {
      activeHuddle: {
        participants: [{ userId: "other-user" }],
      },
      isUserInHuddle: false,
    };

    render(<HuddleHeaderButton channelId="ch-1" />);

    expect(screen.getByTestId("huddle-join-button")).toBeTruthy();
    expect(screen.getByText("Join (1)")).toBeTruthy();
  });

  it("calls joinHuddle when join button is pressed", () => {
    mockHuddleForChannel = {
      activeHuddle: {
        participants: [{ userId: "other-user" }],
      },
      isUserInHuddle: false,
    };

    render(<HuddleHeaderButton channelId="ch-1" />);

    fireEvent.press(screen.getByTestId("huddle-join-button"));
    expect(mockJoinHuddle).toHaveBeenCalledWith("ch-1");
  });

  it("renders 'In huddle' badge when user is in this huddle", () => {
    mockHuddleForChannel = {
      activeHuddle: {
        participants: [{ userId: "me" }],
      },
      isUserInHuddle: true,
    };

    render(<HuddleHeaderButton channelId="ch-1" />);

    expect(screen.getByTestId("huddle-in-progress")).toBeTruthy();
    expect(screen.getByText("In huddle")).toBeTruthy();
  });
});
