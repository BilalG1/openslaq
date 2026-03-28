import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "../../test-utils";
import { AddBookmarkDialog } from "./AddBookmarkDialog";
import { fireEvent } from "@testing-library/react";

afterEach(cleanup);

describe("AddBookmarkDialog", () => {
  test("renders form fields when open", () => {
    render(
      <AddBookmarkDialog open={true} onClose={() => {}} onAdd={() => {}} />,
    );

    expect(screen.getByTestId("bookmark-url-input")).toBeDefined();
    expect(screen.getByTestId("bookmark-title-input")).toBeDefined();
    expect(screen.getByTestId("bookmark-add-button")).toBeDefined();
  });

  test("add button is disabled when URL is empty", () => {
    render(
      <AddBookmarkDialog open={true} onClose={() => {}} onAdd={() => {}} />,
    );

    const addButton = screen.getByTestId("bookmark-add-button") as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });

  test("calls onAdd with URL and title on submit", () => {
    const onAdd = vi.fn();

    render(
      <AddBookmarkDialog open={true} onClose={() => {}} onAdd={onAdd} />,
    );

    act(() => {
      fireEvent.change(screen.getByTestId("bookmark-url-input"), {
        target: { value: "https://example.com" },
      });
      fireEvent.change(screen.getByTestId("bookmark-title-input"), {
        target: { value: "Example Site" },
      });
    });

    act(() => {
      fireEvent.submit(screen.getByTestId("bookmark-add-button").closest("form")!);
    });

    expect(onAdd).toHaveBeenCalledWith("https://example.com", "Example Site");
  });

  test("uses URL as title when title is empty", () => {
    const onAdd = vi.fn();

    render(
      <AddBookmarkDialog open={true} onClose={() => {}} onAdd={onAdd} />,
    );

    act(() => {
      fireEvent.change(screen.getByTestId("bookmark-url-input"), {
        target: { value: "https://example.com" },
      });
    });

    act(() => {
      fireEvent.submit(screen.getByTestId("bookmark-add-button").closest("form")!);
    });

    expect(onAdd).toHaveBeenCalledWith("https://example.com", "https://example.com");
  });
});
