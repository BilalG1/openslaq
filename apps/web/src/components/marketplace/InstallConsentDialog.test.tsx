import { describe, test, expect, afterEach, jest, mock } from "bun:test";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent } from "@testing-library/react";

mock.module("@stripe/stripe-js", () => ({
  loadStripe: async () => null,
}));

const { InstallConsentDialog } = await import("./InstallConsentDialog");

afterEach(cleanup);

const baseListing = {
  id: "listing-1",
  slug: "standup-bot",
  name: "Standup Bot",
  description: "Daily standups",
  longDescription: null,
  avatarUrl: null,
  category: "productivity",
  requestedScopes: ["chat:write", "chat:read"] as any[],
  requestedEvents: ["message:new"] as any[],
  published: true,
};

const singleWorkspace = [{ slug: "default", name: "Default Workspace" }];
const multipleWorkspaces = [
  { slug: "ws-1", name: "Workspace One" },
  { slug: "ws-2", name: "Workspace Two" },
];

describe("InstallConsentDialog", () => {
  test("renders dialog with listing name, scopes, and buttons", async () => {
    const onConfirm = jest.fn(async () => {});
    const onOpenChange = jest.fn();

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
          onOpenChange={jest.fn()}
          listing={baseListing}
          workspaces={singleWorkspace}
          onConfirm={jest.fn(async () => {})}
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
          onOpenChange={jest.fn()}
          listing={baseListing}
          workspaces={multipleWorkspaces}
          onConfirm={jest.fn(async () => {})}
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
          onOpenChange={jest.fn()}
          listing={baseListing}
          workspaces={singleWorkspace}
          onConfirm={jest.fn(async () => {})}
        />,
      );
    });

    expect(screen.getByText("Event subscriptions")).toBeTruthy();
    expect(screen.getByText("message:new")).toBeTruthy();
  });

  test("hides event subscriptions when requestedEvents is empty", async () => {
    const listingNoEvents = { ...baseListing, requestedEvents: [] as any[] };

    await act(async () => {
      render(
        <InstallConsentDialog
          open={true}
          onOpenChange={jest.fn()}
          listing={listingNoEvents}
          workspaces={singleWorkspace}
          onConfirm={jest.fn(async () => {})}
        />,
      );
    });

    expect(screen.queryByText("Event subscriptions")).toBeNull();
  });

  test("calls onConfirm with selected workspace slug and shows Installing state", async () => {
    let resolveInstall!: () => void;
    const onConfirm = jest.fn(
      () => new Promise<void>((resolve) => { resolveInstall = resolve; }),
    );
    const onOpenChange = jest.fn();

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
    const onConfirm = jest.fn(async () => {
      throw new Error("Network error");
    });

    await act(async () => {
      render(
        <InstallConsentDialog
          open={true}
          onOpenChange={jest.fn()}
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
    const onOpenChange = jest.fn();

    await act(async () => {
      render(
        <InstallConsentDialog
          open={true}
          onOpenChange={onOpenChange}
          listing={baseListing}
          workspaces={singleWorkspace}
          onConfirm={jest.fn(async () => {})}
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
    const onConfirm = jest.fn(
      () => new Promise<void>((resolve) => { resolveInstall = resolve; }),
    );

    await act(async () => {
      render(
        <InstallConsentDialog
          open={true}
          onOpenChange={jest.fn()}
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
