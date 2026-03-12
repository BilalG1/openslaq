# Mobile Dev Notes

Lessons learned from building the Expo/React Native mobile app.

## Expo Router

**Flat file routes, not nested directories for dynamic segments.**
Converting `[channelId].tsx` to a directory `[channelId]/` with a nested `_layout.tsx` + `index.tsx` causes a runtime crash (`NSInvalidArgumentException: attempt to insert nil object`). Nested Stack navigators inside dynamic route groups don't work reliably. Instead, keep screens as flat files at the same level (e.g. `[channelId].tsx` and `channel-members.tsx` as siblings under `(channels)/`).

**Typed route pathnames use bracket notation, not interpolation.**
When using `router.push()` with the object form `{ pathname, params }`, the pathname must use literal brackets:
```ts
// Wrong - TS error, won't match typed routes
router.push({ pathname: `/(app)/${slug}/(channels)/channel-members`, params: { channelId } })

// Correct - matches Expo Router's generated types
router.push({ pathname: "/(app)/[workspaceSlug]/(tabs)/(channels)/channel-members", params: { workspaceSlug: slug, channelId } })
```
The string form (`router.push(\`/(app)/${slug}/(channels)/${id}\`)`) works for simple navigation without extra params.

## Native Builds (iOS)

**Always clean-rebuild after dependency changes.**
If the app crashes at startup with `NSInvalidArgumentException` in `RCTThirdPartyComponentsProvider`, the native codegen is stale. Fix:
```bash
cd apps/mobile
npx expo prebuild --platform ios
cd ios && pod install && cd ..
rm -rf ios/build
bun run e2e:build
```

**Don't delete `ios/build` without running prebuild first.**
The build directory contains generated codegen files (`rnscreensJSI-generated.cpp`, etc.) that are created during prebuild. If you `rm -rf ios/build` and then run `xcodebuild` directly, it fails with "Build input file cannot be found". Always run `expo prebuild` before a clean build.

## Expo Go vs Dev Build

**The app cannot run in Expo Go.** Custom native modules (`@livekit/react-native`, `react-native-webrtc`) require a dev build. Expo Go will crash with "The package '@livekit/react-native' doesn't seem to be linked."

Use the dev build (`com.openslaq.mobile`) with Metro serving JS on port 8081.

## NativeWind and Pressable Styles

**NativeWind silently strips inline styles on `Pressable`.**
When using the function-style `style` prop (`style={({ pressed }) => ({ ... })}`), NativeWind's Babel/Metro transform overrides the styles at build time. Changes to padding, backgroundColor, etc. on Pressable will be ignored — no error, no warning.

Workaround: put layout styles (padding, margins, background) on a child `View` instead of on the `Pressable` itself:
```tsx
// Wrong — NativeWind eats the padding
<Pressable onPress={handler} style={({ pressed }) => ({ paddingVertical: 14 })}>
  <Text>...</Text>
</Pressable>

// Correct — View styles are not affected
<Pressable onPress={handler}>
  <View style={{ paddingVertical: 14 }}>
    <Text>...</Text>
  </View>
</Pressable>
```

Plan is to remove NativeWind entirely (only ~94 `className` usages across 13 files).

## SDK Version Mismatches

**Keep expo-* package versions aligned with the base SDK.**
The project uses Expo SDK 54. If any `expo-*` packages drift to SDK 55 (e.g. `expo-file-system@55.x`), the native build will fail with Swift compilation errors like `has no member 'getPathPermissions'`.

Fix: `cd apps/mobile && npx expo install --fix` to downgrade mismatched packages.

**Bun may leave stale copies in `apps/mobile/node_modules/`.**
After `npx expo install --fix` updates `package.json`, Bun sometimes keeps old versions in the local `apps/mobile/node_modules/<pkg>/` directory even though the hoisted copy in root `node_modules/` is correct. The local copy takes precedence, so the app still uses the wrong version.

Fix: manually remove the stale local copy:
```bash
rm -rf apps/mobile/node_modules/<stale-package>
```

## Dev Sign-In (Simulator)

`AuthContext.tsx` has a `__DEV__` hook that reads `detoxTestToken` and `detoxTestUserId` from `NSUserDefaults` (via React Native `Settings`). This lets you bypass OAuth in the simulator:

```bash
# 1. Generate a JWT (use bun, not node, for ESM imports)
bun -e "
import { SignJWT } from 'jose';
const secret = new TextEncoder().encode('openslaq-e2e-test-secret-do-not-use-in-prod');
const userId = crypto.randomUUID();
const jwt = await new SignJWT({
  email: 'dev@openslaq.local', name: 'Dev User', email_verified: true,
  project_id: '924565c5-6377-44b7-aa75-6b7de8d311f4', branch_id: 'main',
  refresh_token_id: 'dev-rt-' + userId, role: 'authenticated',
  selected_team_id: null, is_anonymous: false, is_restricted: false, restricted_reason: null,
}).setProtectedHeader({ alg: 'HS256' }).setSubject(userId)
  .setIssuer('https://api.stack-auth.com/api/v1/projects/924565c5-6377-44b7-aa75-6b7de8d311f4')
  .setAudience('924565c5-6377-44b7-aa75-6b7de8d311f4')
  .setIssuedAt().setExpirationTime('24h').sign(secret);
console.log('userId:', userId);
console.log('jwt:', jwt);
"

# 2. Inject into NSUserDefaults
xcrun simctl spawn <UDID> defaults write com.openslaq.mobile detoxTestToken "<JWT>"
xcrun simctl spawn <UDID> defaults write com.openslaq.mobile detoxTestUserId "<USER_ID>"

# 3. Create a workspace for the new user (API must be running)
curl -s -X POST http://localhost:3001/api/workspaces \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Dev Workspace"}'

# 4. Launch the app
xcrun simctl launch <UDID> com.openslaq.mobile
```

The app reads the token on startup, skips the sign-in screen, fetches the workspace list, and navigates to the home screen.

## Detox E2E Tests (iOS)

**`device.pressBack()` is Android-only.**
On iOS it logs a warning and does nothing. Tap the header back button text instead:
```ts
// The back button shows the previous screen's title
await element(by.text("Channels")).tap();

// Or the headerBackTitle if set on the previous screen
await element(by.text("Back")).tap();
```

**Dismiss the keyboard before tapping buttons in modals.**
When a TextInput has focus inside a Modal, the keyboard shifts the modal content and Detox can't hit-test buttons reliably. Use `tapReturnKey()` to dismiss:
```ts
await element(by.id("my-input")).typeText("hello");
await element(by.id("my-input")).tapReturnKey(); // dismiss keyboard
await element(by.id("submit-button")).tap();       // now hittable
```
Other tests dismiss the keyboard by tapping a visible sibling element (e.g. `message-list`), but inside modals there's often no good tap target.

**Blacklist Socket.IO for Detox sync.**
Socket.IO's long-polling prevents Detox's synchronization from settling. Every test suite needs:
```ts
await device.setURLBlacklist([".*socket\\.io.*"]);
await device.enableSynchronization();
```

**Native Alerts are accessible via `by.text()`.**
`Alert.alert()` buttons can be tapped with `element(by.text("Button Label")).tap()`. This works for both single and chained alerts.

## Physical Device Control (pymobiledevice3)

For CLI-driven screenshots, taps, and swipes on a physical iPhone, use `pymobiledevice3` (installed via `pipx install pymobiledevice3`). `idb` UI commands are simulator-only.

**One-time setup: WebDriverAgent (WDA).**
WDA must be built and installed on the device for tap/swipe/type. The built project lives at `~/source/WebDriverAgent`.
```bash
cd ~/source/WebDriverAgent
xcodebuild build-for-testing \
  -project WebDriverAgent.xcodeproj \
  -scheme WebDriverAgentRunner \
  -destination "id=<UDID>" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM=STXVU374Z3 \
  PRODUCT_BUNDLE_IDENTIFIER=com.openslaq.WebDriverAgentRunner
```

**Start the tunnel daemon (required, runs as root).**
Must stay running in a separate terminal for all developer commands:
```bash
sudo ~/.local/pipx/venvs/pymobiledevice3/bin/python3 -m pymobiledevice3 remote tunneld
```

**Start the WDA test runner (required for tap/swipe/type).**
Must stay running in a separate terminal:
```bash
cd ~/source/WebDriverAgent
xcodebuild test-without-building \
  -project WebDriverAgent.xcodeproj \
  -scheme WebDriverAgentRunner \
  -destination "id=<UDID>" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM=STXVU374Z3 \
  PRODUCT_BUNDLE_IDENTIFIER=com.openslaq.WebDriverAgentRunner
```

**Common commands** (replace `<UDID>` with device UDID, e.g. `00008101-001A6C161460001E`):
```bash
# Screenshot (works without WDA, only needs tunneld)
pymobiledevice3 developer dvt screenshot --tunnel <UDID> /tmp/screenshot.png

# Screenshot via WDA
pymobiledevice3 developer wda screenshot --tunnel <UDID> /tmp/screenshot.png

# Launch app
pymobiledevice3 developer wda launch --tunnel <UDID> com.openslaq.mobile

# Tap element by accessibility id
pymobiledevice3 developer wda tap --tunnel <UDID> -s <SESSION_ID> "element_name"

# Swipe (x1 y1 x2 y2, in points — screen is 390x844)
pymobiledevice3 developer wda swipe --tunnel <UDID> 195 600 195 200

# Type text
pymobiledevice3 developer wda type --tunnel <UDID> "hello world"

# Press hardware button
pymobiledevice3 developer wda press --tunnel <UDID> home

# List tappable elements
pymobiledevice3 developer wda list-items --tunnel <UDID>

# Check WDA status
pymobiledevice3 developer wda status --tunnel <UDID>
```
