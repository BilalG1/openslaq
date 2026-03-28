import { routes } from "../routes";

describe("routes", () => {
  it("generates channel route", () => {
    expect(routes.channel("default", "ch-1")).toBe("/(app)/default/(tabs)/(channels)/ch-1");
  });

  it("generates dm route", () => {
    expect(routes.dm("default", "dm-1")).toBe("/(app)/default/(tabs)/(channels)/dm/dm-1");
  });

  it("generates thread route", () => {
    expect(routes.thread("ws", "msg-1")).toBe("/(app)/ws/thread/msg-1");
  });

  it("generates profile route", () => {
    expect(routes.profile("ws", "user-1")).toBe("/(app)/ws/profile/user-1");
  });

  it("generates settings route", () => {
    expect(routes.settings("ws")).toBe("/(app)/ws/settings");
  });

  it("generates savedItems route", () => {
    expect(routes.savedItems("ws")).toBe("/(app)/ws/saved-items");
  });

  it("generates browse route", () => {
    expect(routes.browse("ws")).toBe("/(app)/ws/(tabs)/(channels)/browse");
  });

  it("generates channels route with (tabs) segment", () => {
    expect(routes.channels("ws")).toBe("/(app)/ws/(tabs)/(channels)");
  });

  it("generates message deep link with web-compatible format", () => {
    expect(routes.messageDeepLink("my-ws", "ch-123", "msg-456")).toBe(
      "openslaq://w/my-ws/c/ch-123/t/msg-456",
    );
  });
});
