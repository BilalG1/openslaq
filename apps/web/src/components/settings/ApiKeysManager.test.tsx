import { describe, test, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent } from "@testing-library/react";

const mockListApiKeys = vi.fn(async () => [] as unknown[]);
const mockCreateApiKey = vi.fn(async () => ({
  id: "key-new",
  name: "New Key",
  token: "osk_full_secret_token_value",
  tokenPrefix: "osk_full_sec",
  scopes: ["chat:read"],
  expiresAt: null,
  lastUsedAt: null,
  createdAt: "2026-03-10T00:00:00.000Z",
}));
const mockDeleteApiKey = vi.fn(async () => {});

vi.mock("../../hooks/api/useApiKeysApi", () => ({
  useApiKeysApi: () => ({
    listApiKeys: mockListApiKeys,
    createApiKey: mockCreateApiKey,
    deleteApiKey: mockDeleteApiKey,
  }),
}));

import { ApiKeysManager } from "./ApiKeysManager";

async function renderManager() {
  await act(async () => {
    render(<ApiKeysManager />);
    await new Promise((r) => setTimeout(r, 50));
  });
}

describe("ApiKeysManager", () => {
  beforeEach(() => {
    mockListApiKeys.mockImplementation(async () => []);
    mockCreateApiKey.mockClear();
    mockDeleteApiKey.mockClear();
  });

  afterEach(cleanup);

  test("shows empty state when no keys exist", async () => {
    await renderManager();
    expect(screen.getByTestId("no-api-keys")).toBeTruthy();
    expect(screen.getByTestId("no-api-keys").textContent).toContain("No API keys yet");
  });

  test("renders list of existing keys", async () => {
    mockListApiKeys.mockImplementation(async () => [
      {
        id: "key-1",
        name: "My CLI Key",
        tokenPrefix: "osk_abcd1234",
        scopes: ["chat:read", "channels:read"],
        expiresAt: null,
        lastUsedAt: "2026-03-09T00:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
      },
    ]);

    await renderManager();

    const row = screen.getByTestId("api-key-row-key-1");
    expect(row).toBeTruthy();
    expect(row.textContent).toContain("My CLI Key");
    expect(row.textContent).toContain("osk_abcd1234");
    expect(row.textContent).toContain("chat:read");
    expect(row.textContent).toContain("channels:read");
  });

  test("shows create form when clicking Create API Key", async () => {
    await renderManager();
    fireEvent.click(screen.getByTestId("create-api-key-btn"));
    expect(screen.getByTestId("create-api-key-form")).toBeTruthy();
    expect(screen.getByTestId("api-key-name-input")).toBeTruthy();
  });

  test("create button is disabled when name is empty or no scopes selected", async () => {
    await renderManager();
    fireEvent.click(screen.getByTestId("create-api-key-btn"));
    const submit = screen.getByTestId("submit-api-key-btn");
    expect(submit.hasAttribute("disabled")).toBe(true);
  });

  test("create flow: fill form, submit, show token", async () => {
    await renderManager();
    fireEvent.click(screen.getByTestId("create-api-key-btn"));

    // Fill name
    fireEvent.change(screen.getByTestId("api-key-name-input"), {
      target: { value: "New Key" },
    });

    // Select a scope
    fireEvent.click(screen.getByTestId("scope-chat:read"));

    // Submit
    await act(async () => {
      fireEvent.click(screen.getByTestId("submit-api-key-btn"));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockCreateApiKey).toHaveBeenCalledWith({
      name: "New Key",
      scopes: ["chat:read"],
    });

    // Token should be displayed
    expect(screen.getByTestId("new-token-display")).toBeTruthy();
    expect(screen.getByTestId("new-token-display").textContent).toContain("osk_full_secret_token_value");
  });

  test("copy button copies token to clipboard", async () => {
    const writeTextMock = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    await renderManager();
    fireEvent.click(screen.getByTestId("create-api-key-btn"));
    fireEvent.change(screen.getByTestId("api-key-name-input"), {
      target: { value: "Copy Test" },
    });
    fireEvent.click(screen.getByTestId("scope-chat:read"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("submit-api-key-btn"));
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("copy-token-btn"));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(writeTextMock).toHaveBeenCalledWith("osk_full_secret_token_value");
  });

  test("delete key calls deleteApiKey and removes from list", async () => {
    mockListApiKeys.mockImplementation(async () => [
      {
        id: "key-1",
        name: "To Delete",
        tokenPrefix: "osk_12345678",
        scopes: ["chat:read"],
        expiresAt: null,
        lastUsedAt: null,
        createdAt: "2026-03-01T00:00:00.000Z",
      },
    ]);

    await renderManager();
    expect(screen.getByTestId("api-key-row-key-1")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-api-key-key-1"));
      await new Promise((r) => setTimeout(r, 50));
    });

    // Confirm dialog should appear
    expect(screen.getByTestId("confirm-dialog-confirm")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockDeleteApiKey).toHaveBeenCalledWith("key-1");
    expect(screen.queryByTestId("api-key-row-key-1")).toBeNull();
  });

  test("delete is cancelled when confirm dialog is dismissed", async () => {
    mockListApiKeys.mockImplementation(async () => [
      {
        id: "key-1",
        name: "Keep Me",
        tokenPrefix: "osk_12345678",
        scopes: ["chat:read"],
        expiresAt: null,
        lastUsedAt: null,
        createdAt: "2026-03-01T00:00:00.000Z",
      },
    ]);

    await renderManager();

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-api-key-key-1"));
      await new Promise((r) => setTimeout(r, 50));
    });

    // Click cancel in confirm dialog
    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-cancel"));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockDeleteApiKey).not.toHaveBeenCalled();
    expect(screen.getByTestId("api-key-row-key-1")).toBeTruthy();
  });
});
