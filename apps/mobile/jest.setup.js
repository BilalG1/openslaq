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
  getAllKeys: jest.fn(() => Promise.resolve([...mockAsyncStore.keys()])),
  multiRemove: jest.fn((keys) => {
    keys.forEach((k) => mockAsyncStore.delete(k));
    return Promise.resolve();
  }),
}));

// Mock expo-clipboard
jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
  getStringAsync: jest.fn(() => Promise.resolve("")),
}));

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "LIGHT", Medium: "MEDIUM", Heavy: "HEAVY" },
  NotificationFeedbackType: { Success: "SUCCESS", Warning: "WARNING", Error: "ERROR" },
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

// Mock expo-av
jest.mock("expo-av", () => {
  const mockSound = {
    playAsync: jest.fn(() => Promise.resolve()),
    pauseAsync: jest.fn(() => Promise.resolve()),
    unloadAsync: jest.fn(() => Promise.resolve()),
    setPositionAsync: jest.fn(() => Promise.resolve()),
    setOnPlaybackStatusUpdate: jest.fn(),
  };
  const mockRecording = {
    prepareToRecordAsync: jest.fn(() => Promise.resolve()),
    startAsync: jest.fn(() => Promise.resolve()),
    stopAndUnloadAsync: jest.fn(() => Promise.resolve()),
    getStatusAsync: jest.fn(() => Promise.resolve({ durationMillis: 1500 })),
    getURI: jest.fn(() => "file:///mock-recording.m4a"),
  };
  return {
    Audio: {
      Recording: jest.fn(() => mockRecording),
      Sound: {
        createAsync: jest.fn(() =>
          Promise.resolve({ sound: mockSound, status: { durationMillis: 45000 } }),
        ),
      },
      requestPermissionsAsync: jest.fn(() =>
        Promise.resolve({ granted: true, status: "granted" }),
      ),
      setAudioModeAsync: jest.fn(() => Promise.resolve()),
      RecordingOptionsPresets: {
        HIGH_QUALITY: {},
      },
    },
  };
});

// Mock lucide-react-native (each icon renders as <Text testID="icon-{Name}">{Name}</Text>)
jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return new Proxy(
    {},
    {
      get: (_, name) => {
        if (name === "__esModule") return true;
        const iconName = String(name);
        return (props) =>
          React.createElement(
            Text,
            { testID: props?.testID ?? `icon-${iconName}` },
            iconName,
          );
      },
    },
  );
});

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
}));

// Mock react-native-image-viewing
// NOTE: Factory must not require("react-native") — nativewind babel injects
// _ReactNativeCSSInterop which breaks jest.mock() scope rules.
const mockImageViewing = "react-native-image-viewing";
jest.mock(mockImageViewing, () => ({
  __esModule: true,
  default: "ImageViewing",
}));

// Mock expo-file-system (v55 API)
const mockExpoFile = jest.fn(function mockFile(_dir, mockFilename) {
  this.uri = "file:///cache/" + mockFilename;
});
mockExpoFile.downloadFileAsync = jest.fn((_url, mockDest) =>
  Promise.resolve({ uri: mockDest.uri }),
);
jest.mock("expo-file-system", () => ({
  Paths: { cache: { uri: "file:///cache/" } },
  File: mockExpoFile,
}));

// Mock expo-sharing
jest.mock("expo-sharing", () => ({
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-media-library
jest.mock("expo-media-library", () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  saveToLibraryAsync: jest.fn(() => Promise.resolve()),
}));

// Mock @openslaq/editor/mobile-html
jest.mock("@openslaq/editor/mobile-html", () => ({
  MOBILE_EDITOR_HTML: "<html><body><div id='editor'></div></body></html>",
}));

// Mock WebViewEditor — renders a View and exposes ref with mock methods
jest.mock("@/components/WebViewEditor", () => {
  const React = require("react");
  const { View } = require("react-native");

  // Shared mock ref that tests can access
  const mockRef = {
    setContent: jest.fn(),
    clearContent: jest.fn(),
    focus: jest.fn(),
    getMarkdown: jest.fn(() => Promise.resolve("")),
    toggleBold: jest.fn(),
    toggleItalic: jest.fn(),
    toggleStrike: jest.fn(),
    toggleCode: jest.fn(),
    toggleBlockquote: jest.fn(),
    toggleBulletList: jest.fn(),
    toggleOrderedList: jest.fn(),
    setLink: jest.fn(),
    unsetLink: jest.fn(),
    insertMention: jest.fn(),
    insertSlashCommand: jest.fn(),
  };

  // Stored callbacks from props for test simulation
  let storedProps = {};

  const WebViewEditor = React.forwardRef(function MockWebViewEditor(props, ref) {
    storedProps = props;
    React.useImperativeHandle(ref, () => mockRef);

    // Auto-fire onReady on mount
    React.useEffect(() => {
      props.onReady?.();
    }, []);

    return React.createElement(View, { testID: "webview-editor" });
  });

  return {
    __esModule: true,
    WebViewEditor,
    __mockRef: mockRef,
    // Test helper: simulate content change (as if user typed)
    _simulateContentChange: (markdown, text, isEmpty) => {
      storedProps.onContentChange?.({ markdown: markdown ?? text, text, isEmpty: isEmpty ?? !text });
    },
    // Test helper: simulate height change
    _simulateHeightChange: (height) => {
      storedProps.onHeightChange?.(height);
    },
    // Test helper: simulate mention query
    _simulateMentionQuery: (query) => {
      storedProps.onMentionQuery?.(query);
    },
    // Test helper: simulate slash query
    _simulateSlashQuery: (query) => {
      storedProps.onSlashQuery?.(query);
    },
    // Test helper: simulate formatting state
    _simulateFormattingState: (state) => {
      storedProps.onFormattingState?.(state);
    },
  };
});

// Mock react-native-webview
jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MockWebView = React.forwardRef(function MockWebView(props, ref) {
    React.useImperativeHandle(ref, () => ({
      injectJavaScript: jest.fn(),
    }));
    return React.createElement(View, { testID: props.testID ?? "mock-webview", ...props });
  });
  return {
    __esModule: true,
    default: MockWebView,
  };
});

// Mock @react-navigation/native (useFocusEffect runs callback immediately in tests)
jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      React.useEffect(() => { cb(); }, []);
    },
    useNavigation: () => ({ setOptions: jest.fn() }),
  };
});
