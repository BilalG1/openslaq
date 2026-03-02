import AsyncStorage from "@react-native-async-storage/async-storage";
import { getThemePreference, setThemePreference } from "../theme-preferences";

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getThemePreference", () => {
  it("returns 'system' by default when nothing stored", async () => {
    mockGetItem.mockResolvedValue(null);
    const pref = await getThemePreference();
    expect(pref).toBe("system");
  });

  it("returns 'light' when stored", async () => {
    mockGetItem.mockResolvedValue("light");
    const pref = await getThemePreference();
    expect(pref).toBe("light");
  });

  it("returns 'dark' when stored", async () => {
    mockGetItem.mockResolvedValue("dark");
    const pref = await getThemePreference();
    expect(pref).toBe("dark");
  });

  it("returns 'system' for invalid stored value", async () => {
    mockGetItem.mockResolvedValue("invalid");
    const pref = await getThemePreference();
    expect(pref).toBe("system");
  });
});

describe("setThemePreference", () => {
  it("stores 'light' preference", async () => {
    await setThemePreference("light");
    expect(mockSetItem).toHaveBeenCalledWith("openslaq-theme-preference", "light");
  });

  it("stores 'dark' preference", async () => {
    await setThemePreference("dark");
    expect(mockSetItem).toHaveBeenCalledWith("openslaq-theme-preference", "dark");
  });

  it("stores 'system' preference", async () => {
    await setThemePreference("system");
    expect(mockSetItem).toHaveBeenCalledWith("openslaq-theme-preference", "system");
  });
});
