import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getNotificationPreferences,
  setNotificationPreferences,
} from "../notification-preferences";

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getNotificationPreferences", () => {
  it("returns defaults when nothing stored", async () => {
    mockGetItem.mockResolvedValue(null);
    const prefs = await getNotificationPreferences();
    expect(prefs).toEqual({ enabled: false, sound: true });
  });

  it("returns enabled: true when stored", async () => {
    mockGetItem.mockImplementation((key) =>
      Promise.resolve(key.includes("enabled") ? "true" : null),
    );
    const prefs = await getNotificationPreferences();
    expect(prefs.enabled).toBe(true);
    expect(prefs.sound).toBe(true);
  });

  it("returns sound: false when stored as false", async () => {
    mockGetItem.mockImplementation((key) =>
      Promise.resolve(key.includes("sound") ? "false" : null),
    );
    const prefs = await getNotificationPreferences();
    expect(prefs.sound).toBe(false);
  });
});

describe("setNotificationPreferences", () => {
  it("stores enabled preference", async () => {
    await setNotificationPreferences({ enabled: true });
    expect(mockSetItem).toHaveBeenCalledWith("openslaq-notifications-enabled", "true");
  });

  it("stores sound preference", async () => {
    await setNotificationPreferences({ sound: false });
    expect(mockSetItem).toHaveBeenCalledWith("openslaq-notifications-sound", "false");
  });

  it("stores both preferences", async () => {
    await setNotificationPreferences({ enabled: true, sound: false });
    expect(mockSetItem).toHaveBeenCalledTimes(2);
  });

  it("does not write when no prefs provided", async () => {
    await setNotificationPreferences({});
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});
