import React from "react";
import { render, screen } from "@testing-library/react-native";
import { MessageInputSwitcher } from "../MessageInputSwitcher";

jest.mock("@/hooks/useDraftRestoration", () => {
  const actual = jest.requireActual("@/hooks/useDraftRestoration");
  return {
    useDraftRestoration: (opts: Parameters<typeof actual.useDraftRestoration>[0]) => {
      const result = actual.useDraftRestoration(opts);
      return { ...result, clearDraft: jest.fn(), saveDraft: jest.fn() };
    },
  };
});

// Mock FeatureFlagsContext
const mockFlags = {
  integrationGithub: "false",
  integrationLinear: "false",
  integrationSentry: "false",
  integrationVercel: "false",
  mobileMessageInput: "default",
};

jest.mock("@/contexts/FeatureFlagsContext", () => ({
  useFeatureFlags: jest.fn(() => mockFlags),
}));

const { useFeatureFlags } = require("@/contexts/FeatureFlagsContext");

beforeEach(() => {
  jest.clearAllMocks();
  useFeatureFlags.mockReturnValue({ ...mockFlags, mobileMessageInput: "default" });
});

describe("MessageInputSwitcher", () => {
  it("renders default MessageInput when flag is 'default'", () => {
    render(<MessageInputSwitcher onSend={jest.fn()} />);

    // Default MessageInput shows formatting-toggle always visible
    expect(screen.getByTestId("formatting-toggle")).toBeTruthy();
  });

  it("renders MessageInputVariantA when flag is 'variant-a'", () => {
    useFeatureFlags.mockReturnValue({ ...mockFlags, mobileMessageInput: "variant-a" });
    render(<MessageInputSwitcher onSend={jest.fn()} onAddAttachment={jest.fn()} />);

    // Variant-A hides formatting-toggle when unfocused
    expect(screen.queryByTestId("formatting-toggle")).toBeNull();
    // But still renders the editor
    expect(screen.getByTestId("webview-editor")).toBeTruthy();
  });
});
