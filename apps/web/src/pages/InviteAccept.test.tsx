import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "../test-utils";
vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ code: "test-code" }),
}));

const mockUser = { id: "user-1", displayName: "Test", getAuthJson: async () => ({ accessToken: "t" }) };
vi.mock("../hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUser,
}));

vi.mock("../lib/auth", () => ({
  redirectToAuth: vi.fn(),
}));

vi.mock("../lib/errors", () => ({
  getErrorMessage: (_err: unknown, fallback: string) => fallback,
}));

let mockGetInvite = vi.fn();
vi.mock("../hooks/api/useInvitesApi", () => ({
  useInvitesApi: () => ({
    getInvite: mockGetInvite,
    acceptInvite: vi.fn(),
  }),
}));

import { InviteAcceptPage } from "./InviteAccept";

describe("InviteAcceptPage", () => {
  afterEach(() => {
    cleanup();
    mockGetInvite.mockReset();
    document.querySelectorAll('meta[name="apple-itunes-app"]').forEach((el) => el.remove());
  });
  test("shows 'already a member' when user is already a workspace member", async () => {
    mockGetInvite.mockResolvedValue({
      workspaceName: "Test Workspace",
      workspaceSlug: "test-ws",
      alreadyMember: true,
    });

    await act(async () => {
      render(<InviteAcceptPage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(screen.getByTestId("already-member-heading")).toBeTruthy();
    expect(screen.getByTestId("already-member-heading").textContent).toContain("already a member");
  });

  test("shows invite prompt when user is not yet a member", async () => {
    mockGetInvite.mockResolvedValue({
      workspaceName: "Test Workspace",
      workspaceSlug: "test-ws",
      alreadyMember: false,
    });

    await act(async () => {
      render(<InviteAcceptPage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(screen.getByTestId("invite-heading")).toBeTruthy();
    expect(screen.getByTestId("invite-heading").textContent).toContain("invited");
  });

  test("adds Smart App Banner meta tag when VITE_APPLE_APP_ID is set", async () => {
    import.meta.env.VITE_APPLE_APP_ID = "123456789";
    mockGetInvite.mockResolvedValue({
      workspaceName: "Test Workspace",
      workspaceSlug: "test-ws",
      alreadyMember: false,
    });

    await act(async () => {
      render(<InviteAcceptPage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const meta = document.querySelector('meta[name="apple-itunes-app"]');
    expect(meta).toBeTruthy();
    expect(meta!.getAttribute("content")).toBe(
      "app-id=123456789, app-argument=openslaq://invite/test-code",
    );

    delete import.meta.env.VITE_APPLE_APP_ID;
  });

  test("does not add Smart App Banner when VITE_APPLE_APP_ID is not set", async () => {
    delete import.meta.env.VITE_APPLE_APP_ID;
    mockGetInvite.mockResolvedValue({
      workspaceName: "Test Workspace",
      workspaceSlug: "test-ws",
      alreadyMember: false,
    });

    await act(async () => {
      render(<InviteAcceptPage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const meta = document.querySelector('meta[name="apple-itunes-app"]');
    expect(meta).toBeNull();
  });
});
