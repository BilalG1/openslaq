import { renderHook } from "@testing-library/react-native";
import { asChannelId } from "@openslaq/shared";
import { useHuddleForChannel } from "../useHuddleForChannel";

let mockState: any = {};

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({ state: mockState }),
}));

describe("useHuddleForChannel", () => {
  beforeEach(() => {
    mockState = {
      activeHuddles: {},
      currentHuddleChannelId: null,
    };
  });

  it("returns null huddle when channelId has no active huddle", () => {
    const { result } = renderHook(() => useHuddleForChannel(asChannelId("ch-1")));

    expect(result.current.activeHuddle).toBeNull();
  });

  it("returns huddle state when channelId has active huddle", () => {
    const huddle = { channelId: asChannelId("ch-1"), participants: [{ userId: "u-1" }] };
    mockState.activeHuddles = { [String(asChannelId("ch-1"))]: huddle };

    const { result } = renderHook(() => useHuddleForChannel(asChannelId("ch-1")));

    expect(result.current.activeHuddle).toEqual(huddle);
  });

  it("returns isUserInHuddle=true when currentHuddleChannelId matches", () => {
    mockState.currentHuddleChannelId = asChannelId("ch-1");

    const { result } = renderHook(() => useHuddleForChannel(asChannelId("ch-1")));

    expect(result.current.isUserInHuddle).toBe(true);
  });

  it("returns isUserInHuddle=false when currentHuddleChannelId differs", () => {
    mockState.currentHuddleChannelId = asChannelId("ch-2");

    const { result } = renderHook(() => useHuddleForChannel(asChannelId("ch-1")));

    expect(result.current.isUserInHuddle).toBe(false);
  });

  it("returns isUserInHuddle=false when both channelId and currentHuddleChannelId are undefined", () => {
    mockState.currentHuddleChannelId = undefined;

    const { result } = renderHook(() => useHuddleForChannel(undefined));

    expect(result.current.isUserInHuddle).toBe(false);
  });

  it("returns null when channelId is undefined", () => {
    mockState.activeHuddles = { [String(asChannelId("ch-1"))]: { channelId: asChannelId("ch-1"), participants: [] } };

    const { result } = renderHook(() => useHuddleForChannel(undefined));

    expect(result.current.activeHuddle).toBeNull();
    expect(result.current.isUserInHuddle).toBe(false);
  });
});
