import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent } from "@testing-library/react";
import type { BotScope, BotEventType } from "@openslaq/shared";

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: async () => null,
}));

import { InstallConsentDialog } from "./InstallConsentDialog";

afterEach(cleanup);

const baseListing = {
  id: "listing-1",
  slug: "standup-bot",
  name: "Standup Bot",
  description: "Daily standups",
  longDescription: null,
  avatarUrl: null,
  category: "productivity",
  requestedScopes: ["chat:write", "chat:read"] as BotScope[],
  requestedEvents: ["message:new"] as BotEventType[],
  published: true,
};

const singleWorkspace = [{ slug: "default", name: "Default Workspace" }];
const multipleWorkspaces = [
  { slug: "ws-1", name: "Workspace One" },
  { slug: "ws-2", name: "Workspace Two" },
];

describe("InstallConsentDialog", () => {
  test("renders dialog with listing name, scopes, and buttons", async () => {
    const onConfirm = vi.fn(async () => {});
    const onOpenChange = vi.fn();

    await act(async () => {
      render(
        <InstallConsentDialog
          open={true}
          onOpenChange={onOpenChange}
          listing={baseListing}
          workspaces={singleWorkspace}
          onConfirm={onConfirm}
        />,
      );
    });

    expect(screen.getByText("Install Standup Bot")).toBeTruthy();
    expect(screen.getByText("chat:write")).toBeTruthy();
    expect(screen.getByText("chat:read")).toBeTruthy();
    expect(screen.getByText("Authorize & Install")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
  });

  test("hides workspace selector when only 1 workspace", async () => {
    await act(async () => {
      render(
        <InstallConsentDialog
          open={true}
          onOpenChange={vi.fn()}
          listing={baseListing}
          workspaces={singleWorkspace}
          onConfirm={vi.fn(async () => {})}
        />,
      );
    });

    expect(screen.queryByText("Workspace")).toBeNull();
  });

  test("shows workspace selector when multiple workspaces", async () => {
    await act(async () => {
      render(
        <InstallConsentDialog
          open={true}
          onOpenChange={vi.fn()}
          listing={baseListing}
          workspaces={multipleWorkspaces}
          onConfirm={vi.fn(async () => {})}
        />,
      );
    });

    expect(screen.getByText("Workspace")).toBeTruthy();
  });

  test("shows event subscriptions when requestedEvents is non-empty", async () => {
    await act(async () => {
      render(
        <InstallConsentDialog
          open={true}
          onOpenChange={vi.fn()}
          listing={baseListing}
          workspaces={singleWorkspace}
          onConfirm={vi.fn(async () => {})}
        />,
      );
    });

    expect(screen.getByText("Event subscriptions")).toBeTruthy();
    expect(screen.getByText("message:new")).toBeTruthy();
  });

  test("hides event subscriptions when requestedEvents is empty", async () => {
    const listingNoEvents = { ...baseListing, requestedEvents: [] as BotEventType[] };

    await act(async () => {
      render(
        <InstallConsentDialog
          open={true}
          onOpenChange={vi.fn()}
          listing={listingNoEvents}
          workspaces={singleWorkspace}
          onConfirm={vi.fn(async () => {})}
        />,
      );
    });

    expect(screen.queryByText("Event subscriptions")).toBeNull();
  });

  test("calls onConfirm with selected workspace slug and shows Installing state", async () => {
    let resolveInstall!: () => void;
    const onConfirm = vi.fn(
      () => new Promise<void>((resolve) => { resolveInstall = resolve; }),
    );
    const onOpenChange = vi.fn();

    await act(async () => {
      render(
        <InstallConsentDialog
          open={true}
          onOpenChange={onOpenChange}
          listing={baseListing}
          workspaces={singleWorkspace}
          onConfirm={onConfirm}
        />,
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-install-button"));
    });

    expect(onConfirm).toHaveBeenCalledWith("default");
    expect(screen.getByText("Installing...")).toBeTruthy();

    await act(async () => {
      resolveInstall();
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("shows error message when onConfirm rejects", async () => {
    const onConfirm = vi.fn(async () => {
      throw new Error("Network error");
    });

    await act(async () => {
      render(
        <InstallConsentDialog
          open={true}
          onOpenChange={vi.fn()}
          listing={baseListing}
          workspaces={singleWorkspace}
          onConfirm={onConfirm}
        />,
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-install-button"));
    });

    expect(screen.getByTestId("install-error").textContent).toBe("Network error");
  });

  test("cancel button calls onOpenChange(false)", async () => {
    const onOpenChange = vi.fn();

    await act(async () => {
      render(
        <InstallConsentDialog
          open={true}
          onOpenChange={onOpenChange}
          listing={baseListing}
          workspaces={singleWorkspace}
          onConfirm={vi.fn(async () => {})}
        />,
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel"));
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("confirm button disabled while installing", async () => {
    let resolveInstall!: () => void;
    const onConfirm = vi.fn(
      () => new Promise<void>((resolve) => { resolveInstall = resolve; }),
    );

    await act(async () => {
      render(
        <InstallConsentDialog
          open={true}
          onOpenChange={vi.fn()}
          listing={baseListing}
          workspaces={singleWorkspace}
          onConfirm={onConfirm}
        />,
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-install-button"));
    });

    const button = screen.getByTestId("confirm-install-button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    await act(async () => {
      resolveInstall();
    });
  });
});
