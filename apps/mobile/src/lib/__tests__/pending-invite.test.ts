import AsyncStorage from "@react-native-async-storage/async-storage";
import { setPendingInvite, consumePendingInvite } from "../pending-invite";

beforeEach(async () => {
  await AsyncStorage.removeItem("openslaq_pending_invite");
  jest.clearAllMocks();
});

describe("pending-invite", () => {
  it("returns null when no pending invite exists", async () => {
    expect(await consumePendingInvite()).toBeNull();
  });

  it("persists and consumes an invite code", async () => {
    await setPendingInvite("abc123");
    expect(await consumePendingInvite()).toBe("abc123");
  });

  it("clears the code after consuming", async () => {
    await setPendingInvite("abc123");
    await consumePendingInvite();
    expect(await consumePendingInvite()).toBeNull();
  });

  it("overwrites a previous pending invite", async () => {
    await setPendingInvite("first");
    await setPendingInvite("second");
    expect(await consumePendingInvite()).toBe("second");
  });
});
