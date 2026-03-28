import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
import { fireEvent } from "@testing-library/react";
import { MessageActionBar } from "./MessageActionBar";
import { TooltipProvider } from "../ui";

function renderBar(props: Partial<Parameters<typeof MessageActionBar>[0]> = {}) {
  return render(
    <TooltipProvider>
      <MessageActionBar
        onAddReaction={vi.fn()}
        {...props}
      />
    </TooltipProvider>,
  );
}

function openOverflowMenu() {
  fireEvent.click(screen.getByTestId("message-overflow-menu"));
}

describe("MessageActionBar", () => {
  afterEach(cleanup);

  test("clicking delete shows confirmation dialog instead of immediately deleting", () => {
    const onDeleteMessage = vi.fn();
    renderBar({ isOwnMessage: true, onDeleteMessage });
    openOverflowMenu();

    fireEvent.click(screen.getByTestId("delete-message-action"));

    // Should NOT have called the delete callback yet
    expect(onDeleteMessage).not.toHaveBeenCalled();
    // Should show a confirmation dialog
    expect(screen.getByTestId("confirm-delete-button")).toBeTruthy();
  });

  test("confirming delete calls onDeleteMessage", () => {
    const onDeleteMessage = vi.fn();
    renderBar({ isOwnMessage: true, onDeleteMessage });
    openOverflowMenu();

    fireEvent.click(screen.getByTestId("delete-message-action"));
    fireEvent.click(screen.getByTestId("confirm-delete-button"));

    expect(onDeleteMessage).toHaveBeenCalledTimes(1);
  });

  test("cancelling delete does NOT call onDeleteMessage", () => {
    const onDeleteMessage = vi.fn();
    renderBar({ isOwnMessage: true, onDeleteMessage });
    openOverflowMenu();

    fireEvent.click(screen.getByTestId("delete-message-action"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(onDeleteMessage).not.toHaveBeenCalled();
  });
});
