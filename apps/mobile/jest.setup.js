// Mock expo-secure-store with in-memory store
// The Map is created fresh per test file (jest re-runs module factories per file)
const mockSecureStore = new Map();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn((key) => Promise.resolve(mockSecureStore.get(key) ?? null)),
  setItemAsync: jest.fn((key, value) => {
    mockSecureStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key) => {
    mockSecureStore.delete(key);
    return Promise.resolve();
  }),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useGlobalSearchParams: jest.fn(() => ({})),
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
  })),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => "/"),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: "Link",
  Redirect: "Redirect",
  Stack: jest.fn(({ children }) => children),
}));

// Mock expo-auth-session
jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "openslaq://redirect"),
}));

// Mock expo-web-browser
jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

// Mock expo-crypto
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "00000000-0000-0000-0000-000000000000"),
  digestStringAsync: jest.fn(() => Promise.resolve("mock-digest")),
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  CryptoEncoding: { BASE64: "base64" },
}));

// Mock expo-apple-authentication
jest.mock("expo-apple-authentication", () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: {
    EMAIL: 1,
    FULL_NAME: 0,
  },
}));

// Mock expo-notifications
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "undetermined", granted: false, canAskAgain: true }),
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true }),
  ),
  setNotificationHandler: jest.fn(),
  getDevicePushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: "mock-apns-token", type: "ios" }),
  ),
  setBadgeCountAsync: jest.fn(() => Promise.resolve(true)),
  dismissNotificationAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  PermissionStatus: {
    UNDETERMINED: "undetermined",
    GRANTED: "granted",
    DENIED: "denied",
  },
}));

// Mock @react-native-async-storage/async-storage with in-memory store
const mockAsyncStore = new Map();
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn((key) => Promise.resolve(mockAsyncStore.get(key) ?? null)),
  setItem: jest.fn((key, value) => {
    mockAsyncStore.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    mockAsyncStore.delete(key);
    return Promise.resolve();
  }),
  multiGet: jest.fn((keys) =>
    Promise.resolve(keys.map((k) => [k, mockAsyncStore.get(k) ?? null])),
  ),
  multiSet: jest.fn((pairs) => {
    pairs.forEach(([k, v]) => mockAsyncStore.set(k, v));
    return Promise.resolve();
  }),
}));

// Mock expo-clipboard
jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
  getStringAsync: jest.fn(() => Promise.resolve("")),
}));

// Mock react-native-svg (render as string tags — avoids babel/nativewind interference)
jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Svg: "Svg",
  Path: "Path",
  G: "G",
  Rect: "Rect",
  Defs: "Defs",
  ClipPath: "ClipPath",
}));

// Mock react-native-css-interop runtime (loaded by nativewind JSX transform)
jest.mock("react-native-css-interop", () => ({
  cssInterop: (component) => component,
  remapProps: () => (component) => component,
}));

// Mock nativewind styled (safety net if CSS interop fails in JSDOM)
jest.mock("nativewind", () => ({
  styled: (component) => component,
}));
