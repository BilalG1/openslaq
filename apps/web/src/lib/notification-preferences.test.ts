import { describe, expect, test, beforeEach } from "vitest";
import { getNotificationPreferences, setNotificationPreferences } from "./notification-preferences";

describe("notification-preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getNotificationPreferences", () => {
    test("returns defaults when no keys set", () => {
      expect(getNotificationPreferences()).toEqual({ enabled: false, sound: true });
    });

    test("reads enabled=true from localStorage", () => {
      localStorage.setItem("openslaq-notifications-enabled", "true");
      expect(getNotificationPreferences().enabled).toBe(true);
    });

    test("reads enabled=false from localStorage", () => {
      localStorage.setItem("openslaq-notifications-enabled", "false");
      expect(getNotificationPreferences().enabled).toBe(false);
    });

    test("reads sound=false from localStorage", () => {
      localStorage.setItem("openslaq-notifications-sound", "false");
      expect(getNotificationPreferences().sound).toBe(false);
    });

    test("sound defaults to true for non-false values", () => {
      localStorage.setItem("openslaq-notifications-sound", "true");
      expect(getNotificationPreferences().sound).toBe(true);
    });

    test("enabled is false for non-true values", () => {
      localStorage.setItem("openslaq-notifications-enabled", "yes");
      expect(getNotificationPreferences().enabled).toBe(false);
    });
  });

  describe("setNotificationPreferences", () => {
    test("sets enabled", () => {
      setNotificationPreferences({ enabled: true });
      expect(localStorage.getItem("openslaq-notifications-enabled")).toBe("true");
    });

    test("sets sound", () => {
      setNotificationPreferences({ sound: false });
      expect(localStorage.getItem("openslaq-notifications-sound")).toBe("false");
    });

    test("sets both at once", () => {
      setNotificationPreferences({ enabled: true, sound: false });
      expect(localStorage.getItem("openslaq-notifications-enabled")).toBe("true");
      expect(localStorage.getItem("openslaq-notifications-sound")).toBe("false");
    });

    test("partial update does not clear other key", () => {
      setNotificationPreferences({ enabled: true, sound: true });
      setNotificationPreferences({ enabled: false });
      expect(localStorage.getItem("openslaq-notifications-enabled")).toBe("false");
      expect(localStorage.getItem("openslaq-notifications-sound")).toBe("true");
    });

    test("empty partial update changes nothing", () => {
      setNotificationPreferences({ enabled: true });
      setNotificationPreferences({});
      expect(localStorage.getItem("openslaq-notifications-enabled")).toBe("true");
    });
  });
});
