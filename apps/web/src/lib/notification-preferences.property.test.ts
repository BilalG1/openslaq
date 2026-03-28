import { describe, test, expect, beforeEach } from "vitest";
import fc from "fast-check";
import {
  getNotificationPreferences,
  setNotificationPreferences,
} from "./notification-preferences";

describe("notification-preferences property tests", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("round-trip: set then get preserves boolean values", () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (enabled, sound) => {
        localStorage.clear();
        setNotificationPreferences({ enabled, sound });
        const result = getNotificationPreferences();
        expect(result.enabled).toBe(enabled);
        expect(result.sound).toBe(sound);
      }),
    );
  });

  test("partial set only changes specified fields", () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (enabled, sound) => {
        localStorage.clear();
        setNotificationPreferences({ enabled, sound });

        // Set only enabled with a new value
        const newEnabled = !enabled;
        setNotificationPreferences({ enabled: newEnabled });
        const result = getNotificationPreferences();
        expect(result.enabled).toBe(newEnabled);
        expect(result.sound).toBe(sound); // unchanged
      }),
    );
  });

  test("defaults: enabled=false, sound=true when localStorage is empty", () => {
    localStorage.clear();
    const result = getNotificationPreferences();
    expect(result.enabled).toBe(false);
    expect(result.sound).toBe(true);
  });

  test("corrupted localStorage values don't throw", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (enabledVal, soundVal) => {
        localStorage.clear();
        localStorage.setItem("openslaq-notifications-enabled", enabledVal);
        localStorage.setItem("openslaq-notifications-sound", soundVal);
        // Should never throw
        const result = getNotificationPreferences();
        expect(typeof result.enabled).toBe("boolean");
        expect(typeof result.sound).toBe("boolean");
      }),
    );
  });

  test("enabled is true only when localStorage value is exactly 'true'", () => {
    fc.assert(
      fc.property(fc.string(), (val) => {
        localStorage.clear();
        localStorage.setItem("openslaq-notifications-enabled", val);
        const result = getNotificationPreferences();
        expect(result.enabled).toBe(val === "true");
      }),
    );
  });

  test("sound is false only when localStorage value is exactly 'false'", () => {
    fc.assert(
      fc.property(fc.string(), (val) => {
        localStorage.clear();
        localStorage.setItem("openslaq-notifications-sound", val);
        const result = getNotificationPreferences();
        expect(result.sound).toBe(val !== "false");
      }),
    );
  });
});
