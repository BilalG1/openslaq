import React from "react";
import { Text } from "react-native";
import { render, screen, act, waitFor } from "@testing-library/react-native";

const mockGetFeatureFlags = jest.fn();
jest.mock("@openslaq/client-core", () => ({
  getFeatureFlags: (...args: unknown[]) => mockGetFeatureFlags(...args),
}));

jest.mock("@/contexts/WorkspaceBootstrapProvider", () => ({
  useWorkspaceSlug: jest.fn(() => "test-workspace"),
}));

jest.mock("@/hooks/useOperationDeps", () => ({
  useApiDeps: jest.fn(() => ({ api: {}, auth: {} })),
}));

import { FeatureFlagsProvider, useFeatureFlags } from "../FeatureFlagsContext";

function TestConsumer() {
  const flags = useFeatureFlags();
  return <Text testID="flag-value">{flags.mobileMessageInput}</Text>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("FeatureFlagsContext", () => {
  it("returns defaults before fetch completes", () => {
    mockGetFeatureFlags.mockReturnValue(new Promise(() => {})); // never resolves
    render(
      <FeatureFlagsProvider>
        <TestConsumer />
      </FeatureFlagsProvider>,
    );

    expect(screen.getByTestId("flag-value").props.children).toBe("default");
  });

  it("updates with fetched flags", async () => {
    mockGetFeatureFlags.mockResolvedValue({
      integrationGithub: "false",
      integrationLinear: "false",
      integrationSentry: "false",
      integrationVercel: "false",
      mobileMessageInput: "variant-a",
    });

    render(
      <FeatureFlagsProvider>
        <TestConsumer />
      </FeatureFlagsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("flag-value").props.children).toBe("variant-a");
    });
  });

  it("keeps defaults on fetch error", async () => {
    mockGetFeatureFlags.mockRejectedValue(new Error("Network error"));

    render(
      <FeatureFlagsProvider>
        <TestConsumer />
      </FeatureFlagsProvider>,
    );

    // Wait for the rejection to be handled
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(screen.getByTestId("flag-value").props.children).toBe("default");
  });
});
