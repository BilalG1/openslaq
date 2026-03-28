import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
import { HuddleIndicator } from "./HuddleIndicator";

afterEach(cleanup);

describe("HuddleIndicator", () => {
  test("renders the SVG icon", () => {
    render(<HuddleIndicator channelId="ch-1" participantCount={3} />);
    const indicator = screen.getByTestId("huddle-indicator-ch-1");
    expect(indicator).toBeTruthy();
    const svg = indicator.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  test("shows participant count", () => {
    render(<HuddleIndicator channelId="ch-1" participantCount={5} />);
    expect(screen.getByText("5")).toBeTruthy();
  });

  test("uses channelId in data-testid", () => {
    render(<HuddleIndicator channelId="my-channel" participantCount={2} />);
    expect(screen.getByTestId("huddle-indicator-my-channel")).toBeTruthy();
  });

  test("displays correct count for single participant", () => {
    render(<HuddleIndicator channelId="ch-1" participantCount={1} />);
    expect(screen.getByText("1")).toBeTruthy();
  });
});
