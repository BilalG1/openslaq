import { describe, test, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "../../test-utils";
import { EphemeralMessageItem } from "./EphemeralMessage";
import type { EphemeralMessage } from "@openslaq/shared";
import { asChannelId } from "@openslaq/shared";

afterEach(cleanup);

function makeEphemeral(overrides?: Partial<EphemeralMessage>): EphemeralMessage {
  return {
    id: "eph-1",
    channelId: asChannelId("00000000-0000-0000-0000-000000000001"),
    text: "This channel has been muted.",
    senderName: "Slaqbot",
    senderAvatarUrl: null,
    createdAt: new Date().toISOString(),
    ephemeral: true,
    ...overrides,
  };
}

describe("EphemeralMessageItem", () => {
  test("renders message text and sender name", () => {
    render(<EphemeralMessageItem message={makeEphemeral()} />);
    expect(screen.getByText("This channel has been muted.")).toBeTruthy();
    expect(screen.getByText("Slaqbot")).toBeTruthy();
  });

  test("shows 'Only visible to you' badge", () => {
    render(<EphemeralMessageItem message={makeEphemeral()} />);
    expect(screen.getByText("Only visible to you")).toBeTruthy();
  });

  test("renders with data-testid", () => {
    render(<EphemeralMessageItem message={makeEphemeral()} />);
    expect(screen.getByTestId("ephemeral-message")).toBeTruthy();
  });
});
