import { describe, test, expect, afterEach, jest, mock } from "bun:test";
import { render, screen, cleanup } from "../../test-utils";
import { fireEvent } from "@testing-library/react";
import { createRef, type RefObject } from "react";

let capturedOnEmojiSelect: ((emoji: { native?: string; id?: string; src?: string }) => void) | null = null;

mock.module("@emoji-mart/react", () => ({
  default: ({ onEmojiSelect }: { onEmojiSelect: (emoji: { native?: string; id?: string; src?: string }) => void }) => {
    capturedOnEmojiSelect = onEmojiSelect;
    return <div data-testid="mock-picker">Picker</div>;
  },
}));

mock.module("../../theme/ThemeProvider", () => ({
  useTheme: () => ({ resolved: "dark" }),
}));

const { EmojiPicker } = await import("./EmojiPicker");

function createAnchor(): RefObject<HTMLElement | null> {
  const div = document.createElement("div");
  document.body.appendChild(div);
  // Mock getBoundingClientRect for positioning
  div.getBoundingClientRect = () => ({
    top: 100,
    bottom: 140,
    left: 50,
    right: 100,
    width: 50,
    height: 40,
    x: 50,
    y: 100,
    toJSON: () => {},
  });
  const ref = createRef<HTMLElement>();
  (ref as { current: HTMLElement }).current = div;
  return ref;
}

describe("EmojiPicker", () => {
  afterEach(() => {
    cleanup();
    capturedOnEmojiSelect = null;
    // Clean up appended divs
    document.body.querySelectorAll("div").forEach((d) => {
      if (d.parentElement === document.body && !d.getAttribute("id")) {
        try { document.body.removeChild(d); } catch {}
      }
    });
  });

  test("renders picker via portal when anchor is connected", () => {
    const anchorRef = createAnchor();
    render(
      <EmojiPicker onSelect={jest.fn()} onClose={jest.fn()} anchorRef={anchorRef} />,
    );
    expect(screen.getByTestId("emoji-picker")).toBeTruthy();
    expect(screen.getByTestId("mock-picker")).toBeTruthy();
  });

  test("returns null when anchorRef.current is null", () => {
    const ref = createRef<HTMLElement>();
    render(
      <EmojiPicker onSelect={jest.fn()} onClose={jest.fn()} anchorRef={ref} />,
    );
    expect(screen.queryByTestId("emoji-picker")).toBeNull();
  });

  test("calls onSelect with native emoji string", () => {
    const onSelect = jest.fn();
    const anchorRef = createAnchor();
    render(
      <EmojiPicker onSelect={onSelect} onClose={jest.fn()} anchorRef={anchorRef} />,
    );

    capturedOnEmojiSelect!({ native: "😀" });
    expect(onSelect).toHaveBeenCalledWith("😀");
  });

  test("calls onSelect with :custom:id: format for custom emojis", () => {
    const onSelect = jest.fn();
    const anchorRef = createAnchor();
    render(
      <EmojiPicker onSelect={onSelect} onClose={jest.fn()} anchorRef={anchorRef} />,
    );

    capturedOnEmojiSelect!({ id: "partyparrot" });
    expect(onSelect).toHaveBeenCalledWith(":custom:partyparrot:");
  });

  test("calls onClose when clicking the backdrop", () => {
    const onClose = jest.fn();
    const anchorRef = createAnchor();
    render(
      <EmojiPicker onSelect={jest.fn()} onClose={onClose} anchorRef={anchorRef} />,
    );

    // The backdrop is the fixed inset-0 div
    const backdrop = document.querySelector(".fixed.inset-0");
    expect(backdrop).toBeTruthy();
    fireEvent.mouseDown(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  test("positions above anchor when below-viewport", () => {
    const anchorRef = createAnchor();
    // Simulate anchor near bottom of viewport
    const el = anchorRef.current!;
    el.getBoundingClientRect = () => ({
      top: 500,
      bottom: 540,
      left: 50,
      right: 100,
      width: 50,
      height: 40,
      x: 50,
      y: 500,
      toJSON: () => {},
    });

    // Set viewport height small enough that picker won't fit below
    Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });

    render(
      <EmojiPicker onSelect={jest.fn()} onClose={jest.fn()} anchorRef={anchorRef} />,
    );

    const pickerEl = screen.getByTestId("emoji-picker");
    const top = parseFloat(pickerEl.style.top);
    // Should be positioned above: rect.top - PICKER_HEIGHT - 4 = 500 - 435 - 4 = 61
    expect(top).toBe(61);
  });

  test("clamps left position when near right edge", () => {
    const anchorRef = createAnchor();
    const el = anchorRef.current!;
    el.getBoundingClientRect = () => ({
      top: 100,
      bottom: 140,
      left: 800,
      right: 850,
      width: 50,
      height: 40,
      x: 800,
      y: 100,
      toJSON: () => {},
    });

    Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });
    Object.defineProperty(window, "innerWidth", { value: 900, configurable: true });

    render(
      <EmojiPicker onSelect={jest.fn()} onClose={jest.fn()} anchorRef={anchorRef} />,
    );

    const pickerEl = screen.getByTestId("emoji-picker");
    const left = parseFloat(pickerEl.style.left);
    // vw - PICKER_WIDTH - EDGE_MARGIN = 900 - 352 - 8 = 540
    expect(left).toBe(540);
  });
});
