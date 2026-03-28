import { describe, test, expect, afterEach, beforeEach, vi } from "vitest";
import { renderHook, act, cleanup } from "../test-utils";

vi.mock("@openslaq/shared", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    getWebCssVariables: (mode: string) => ({
      "--bg": mode === "dark" ? "#000" : "#fff",
    }),
  };
});

import {  ThemeProvider, useTheme  } from "./ThemeProvider";

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.cssText = "";
  });

  afterEach(cleanup);

  test("defaults to system preference when no stored value", () => {
    // Mock system preference as dark
    Object.defineProperty(window, "matchMedia", {
      value: (query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      configurable: true,
    });

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });

    expect(result.current.mode).toBe("dark");
    expect(result.current.resolved).toBe("dark");
  });

  test("reads stored mode from localStorage", () => {
    localStorage.setItem("openslaq-theme", "light");

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });

    expect(result.current.mode).toBe("light");
  });

  test("setMode persists to localStorage and applies dark class", () => {
    localStorage.setItem("openslaq-theme", "light");

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });

    act(() => {
      result.current.setMode("dark");
    });

    expect(result.current.mode).toBe("dark");
    expect(localStorage.getItem("openslaq-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  test("setMode light removes dark class", () => {
    localStorage.setItem("openslaq-theme", "dark");

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });

    act(() => {
      result.current.setMode("light");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  test("cycle toggles between light and dark", () => {
    localStorage.setItem("openslaq-theme", "light");

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });

    expect(result.current.mode).toBe("light");

    act(() => {
      result.current.cycle();
    });

    expect(result.current.mode).toBe("dark");
    expect(localStorage.getItem("openslaq-theme")).toBe("dark");

    act(() => {
      result.current.cycle();
    });

    expect(result.current.mode).toBe("light");
    expect(localStorage.getItem("openslaq-theme")).toBe("light");
  });

  test("invalid localStorage value falls back to system preference", () => {
    localStorage.setItem("openslaq-theme", "invalid");

    Object.defineProperty(window, "matchMedia", {
      value: (query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      configurable: true,
    });

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });

    expect(result.current.mode).toBe("dark");
  });

  test("useTheme outside provider throws error", () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow("useTheme must be used within ThemeProvider");
  });

  test("CSS variables applied to documentElement.style", () => {
    localStorage.setItem("openslaq-theme", "dark");

    renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });

    expect(document.documentElement.style.getPropertyValue("--bg")).toBe("#000");
  });
});
