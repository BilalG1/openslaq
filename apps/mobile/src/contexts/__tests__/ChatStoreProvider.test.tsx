import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { render, screen, act, fireEvent } from "@testing-library/react-native";
import { asWorkspaceId, asChannelId } from "@openslaq/shared";
import { ChatStoreProvider, useChatStore, useChatSelectors } from "../ChatStoreProvider";

function TestConsumer() {
  const { state, dispatch } = useChatStore();
  return (
    <>
      <Text testID="workspace-slug">{state.workspaceSlug ?? "none"}</Text>
      <Text testID="channel-count">{String(state.channels.length)}</Text>
      <Text testID="active-channel">
        {state.activeChannelId ?? "none"}
      </Text>
      <TouchableOpacity
        testID="bootstrap-start"
        onPress={() =>
          dispatch({ type: "workspace/bootstrapStart", workspaceSlug: "test" })
        }
      />
      <TouchableOpacity
        testID="bootstrap"
        onPress={() =>
          dispatch({
            type: "workspace/bootstrapSuccess",
            workspaces: [
              {
                id: asWorkspaceId("ws-1"),
                name: "Test",
                slug: "test",
                createdAt: "2025-01-01T00:00:00Z",
                role: "owner" as const,
              },
            ],
            channels: [
              {
                id: asChannelId("ch-1"),
                name: "general",
                displayName: null,
                workspaceId: asWorkspaceId("ws-1"),
                type: "public" as const,
                description: null,
                isArchived: false,
                createdAt: "2025-01-01T00:00:00Z",
                createdBy: null,
              },
            ],
            dms: [],
            groupDms: [],
          })
        }
      />
      <TouchableOpacity
        testID="select-channel"
        onPress={() =>
          dispatch({ type: "workspace/selectChannel", channelId: asChannelId("ch-1") })
        }
      />
    </>
  );
}

function getTestIdText(testID: string): string {
  return (screen.getByTestId(testID).children as string[]).join("");
}

describe("ChatStoreProvider", () => {
  it("provides initial state", () => {
    render(
      <ChatStoreProvider>
        <TestConsumer />
      </ChatStoreProvider>,
    );

    expect(getTestIdText("workspace-slug")).toBe("none");
    expect(getTestIdText("channel-count")).toBe("0");
    expect(getTestIdText("active-channel")).toBe("none");
  });

  it("dispatch updates state correctly", async () => {
    render(
      <ChatStoreProvider>
        <TestConsumer />
      </ChatStoreProvider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId("bootstrap-start"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("bootstrap"));
    });

    expect(getTestIdText("workspace-slug")).toBe("test");
    expect(getTestIdText("channel-count")).toBe("1");

    await act(async () => {
      fireEvent.press(screen.getByTestId("select-channel"));
    });

    expect(getTestIdText("active-channel")).toBe("ch-1");
  });

  it("throws when used outside provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useChatStore must be used inside ChatStoreProvider");

    spy.mockRestore();
  });
});

function SelectorsProbe() {
  const { dispatch } = useChatStore();
  const { activeChannel, activeDm, currentChannelId, channelMessages } = useChatSelectors();

  return (
    <>
      <Text testID="sel-active-channel">{activeChannel?.name ?? "none"}</Text>
      <Text testID="sel-active-dm">{activeDm?.otherUser.displayName ?? "none"}</Text>
      <Text testID="sel-current-channel-id">{String(currentChannelId ?? "none")}</Text>
      <Text testID="sel-message-count">{String(channelMessages.length)}</Text>
      <TouchableOpacity
        testID="sel-bootstrap-start"
        onPress={() => dispatch({ type: "workspace/bootstrapStart", workspaceSlug: "test" })}
      />
      <TouchableOpacity
        testID="sel-bootstrap"
        onPress={() =>
          dispatch({
            type: "workspace/bootstrapSuccess",
            workspaces: [
              {
                id: asWorkspaceId("ws-1"),
                name: "Test",
                slug: "test",
                createdAt: "2025-01-01T00:00:00Z",
                role: "owner" as const,
              },
            ],
            channels: [
              {
                id: asChannelId("ch-1"),
                name: "general",
                displayName: null,
                workspaceId: asWorkspaceId("ws-1"),
                type: "public" as const,
                description: null,
                isArchived: false,
                createdAt: "2025-01-01T00:00:00Z",
                createdBy: null,
              },
            ],
            dms: [
              {
                channel: {
                  id: asChannelId("dm-1"),
                  name: "dm-alice",
                  displayName: null,
                  workspaceId: asWorkspaceId("ws-1"),
                  type: "dm" as const,
                  description: null,
                  isArchived: false,
                  createdAt: "2025-01-01T00:00:00Z",
                  createdBy: null,
                },
                otherUser: { id: "u-alice", displayName: "Alice", avatarUrl: null },
                lastMessageContent: null,
                lastMessageAt: null,
              },
            ],
            groupDms: [],
          })
        }
      />
      <TouchableOpacity
        testID="sel-select-channel"
        onPress={() => dispatch({ type: "workspace/selectChannel", channelId: asChannelId("ch-1") })}
      />
      <TouchableOpacity
        testID="sel-select-dm"
        onPress={() => dispatch({ type: "workspace/selectDm", channelId: String(asChannelId("dm-1")) })}
      />
    </>
  );
}

function getSelText(testID: string): string {
  return (screen.getByTestId(testID).children as string[]).join("");
}

describe("useChatSelectors", () => {
  it("returns null when no channel selected", async () => {
    render(
      <ChatStoreProvider>
        <SelectorsProbe />
      </ChatStoreProvider>,
    );

    expect(getSelText("sel-active-channel")).toBe("none");
    expect(getSelText("sel-active-dm")).toBe("none");
    expect(getSelText("sel-current-channel-id")).toBe("none");
    expect(getSelText("sel-message-count")).toBe("0");
  });

  it("returns activeChannel when activeChannelId matches a channel", async () => {
    render(
      <ChatStoreProvider>
        <SelectorsProbe />
      </ChatStoreProvider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId("sel-bootstrap-start"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("sel-bootstrap"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("sel-select-channel"));
    });

    expect(getSelText("sel-active-channel")).toBe("general");
    expect(getSelText("sel-current-channel-id")).toBe("ch-1");
  });

  it("returns activeDm when activeDmId matches a DM", async () => {
    render(
      <ChatStoreProvider>
        <SelectorsProbe />
      </ChatStoreProvider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId("sel-bootstrap-start"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("sel-bootstrap"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("sel-select-dm"));
    });

    expect(getSelText("sel-active-dm")).toBe("Alice");
    expect(getSelText("sel-current-channel-id")).toBe("dm-1");
  });
});
