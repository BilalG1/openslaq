import { describe, expect, it, afterEach } from "vitest";
import { render, cleanup } from "../../test-utils";
import { TypingIndicator } from "./TypingIndicator";

afterEach(cleanup);

const makeUser = (id: string, name: string) => ({
  userId: id,
  displayName: name,
  expiresAt: Date.now() + 5000,
});

describe("TypingIndicator", () => {
  it("always renders a container", () => {
    const { container } = render(<TypingIndicator typingUsers={[]} />);
    expect(container.firstChild).not.toBeNull();
    expect(container.firstChild!.textContent).toBe("");
  });

  it("is hidden when no users are typing", () => {
    const { container } = render(<TypingIndicator typingUsers={[]} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("invisible");
  });

  it("is visible and absolutely positioned when users are typing", () => {
    const { container } = render(
      <TypingIndicator typingUsers={[makeUser("u1", "Alice")]} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toContain("invisible");
    expect(el.className).toContain("absolute");
  });

  it("does not shift layout (no h-0/h-6 toggling)", () => {
    const { container, rerender } = render(<TypingIndicator typingUsers={[]} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toContain("h-0");
    expect(el.className).not.toContain("h-6");

    rerender(<TypingIndicator typingUsers={[makeUser("u1", "Alice")]} />);
    const el2 = container.firstChild as HTMLElement;
    expect(el2.className).not.toContain("h-0");
    expect(el2.className).not.toContain("h-6");
  });

  it("shows display name for one user typing", () => {
    const { getByTestId } = render(
      <TypingIndicator typingUsers={[makeUser("u1", "Alice")]} />,
    );
    expect(getByTestId("typing-indicator").textContent).toContain("Alice");
  });

  it("shows animated dots element with three dot spans", () => {
    const { getByTestId } = render(
      <TypingIndicator typingUsers={[makeUser("u1", "Alice")]} />,
    );
    const dots = getByTestId("typing-dots");
    expect(dots).toBeDefined();
    expect(dots.querySelectorAll("span").length).toBe(3);
  });
});
