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

  it("has zero rendered height when no users are typing", () => {
    const { container } = render(<TypingIndicator typingUsers={[]} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("h-0");
    expect(el.className).toContain("overflow-hidden");
    expect(el.className).not.toContain("h-6");
  });

  it("has visible height when users are typing", () => {
    const { container } = render(
      <TypingIndicator typingUsers={[makeUser("u1", "Alice")]} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("h-6");
    expect(el.className).not.toContain("h-0");
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
