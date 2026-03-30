#!/usr/bin/env bash
# Usage: bash scripts/release/release-desktop.sh
# Bump version in apps/desktop/src-tauri/tauri.conf.json before running.
set -euo pipefail

REPO="bilalg1/openslaq"
CONF="apps/desktop/src-tauri/tauri.conf.json"
TAURI_ENV="$HOME/.tauri/env"

# Load signing & notarization credentials from ~/.tauri/env
if [ ! -f "$TAURI_ENV" ]; then
  echo "ERROR: $TAURI_ENV not found."
  echo "  Create it with APPLE_* and TAURI_SIGNING_* variables."
  exit 1
fi

# shellcheck source=/dev/null
source "$TAURI_ENV"
export APPLE_CERTIFICATE APPLE_CERTIFICATE_PASSWORD APPLE_SIGNING_IDENTITY
export APPLE_ID APPLE_PASSWORD APPLE_TEAM_ID
export TAURI_SIGNING_PRIVATE_KEY TAURI_SIGNING_PRIVATE_KEY_PASSWORD

# Read version from tauri.conf.json
VERSION=$(grep '"version"' "$CONF" | head -1 | sed 's/.*"version": *"//;s/".*//')
TAG="desktop-v${VERSION}"
BUNDLE_DIR="apps/desktop/src-tauri/target/release/bundle"

echo "==> Building OpenSlaq Desktop ${TAG}"

# Clean stale artifacts so we never ship leftovers from a previous build
rm -f "$BUNDLE_DIR/macos/OpenSlaq.app.tar.gz" \
      "$BUNDLE_DIR/macos/OpenSlaq.app.tar.gz.sig" \
      "$BUNDLE_DIR/dmg/OpenSlaq_"*"_aarch64.dmg"

# Build (may fail at DMG step — that's OK, we handle it below)
echo "==> Running tauri build..."
cd apps/desktop
bunx @tauri-apps/cli build || echo "WARN: tauri build exited non-zero, checking artifacts..."
cd ../..

# Ensure .app exists (required — if this is missing the build truly failed)
APP_DIR="$BUNDLE_DIR/macos/OpenSlaq.app"
if [ ! -d "$APP_DIR" ]; then
  echo "ERROR: OpenSlaq.app not found. Build failed."
  exit 1
fi

# Create DMG if Tauri didn't (known issue on some macOS versions)
DMG="$BUNDLE_DIR/dmg/OpenSlaq_${VERSION}_aarch64.dmg"
if [ ! -f "$DMG" ]; then
  echo "==> DMG not found, creating manually..."
  rm -f "$BUNDLE_DIR/macos"/rw.*.dmg  # clean up partial DMGs
  mkdir -p "$BUNDLE_DIR/dmg"
  hdiutil create -volname "OpenSlaq" -srcfolder "$APP_DIR" -ov -format UDZO "$DMG"
fi

# Create tarball if Tauri didn't
APP_TAR="$BUNDLE_DIR/macos/OpenSlaq.app.tar.gz"
if [ ! -f "$APP_TAR" ]; then
  echo "==> Tarball not found, creating manually..."
  tar czf "$APP_TAR" -C "$BUNDLE_DIR/macos" OpenSlaq.app
fi

# Create signature if Tauri didn't
APP_SIG="${APP_TAR}.sig"
if [ ! -f "$APP_SIG" ]; then
  echo "==> Signature not found, signing manually..."
  cd apps/desktop
  bunx @tauri-apps/cli signer sign -k "$TAURI_SIGNING_PRIVATE_KEY" -p "${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}" "../../$APP_TAR"
  cd ../..
fi

echo "==> Artifacts:"
ls -lh "$DMG" "$APP_TAR" "$APP_SIG"

# Generate latest.json for Tauri updater
SIGNATURE=$(cat "$APP_SIG")
APP_TAR_FILENAME=$(basename "$APP_TAR")
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > latest.json <<EOF
{
  "version": "${VERSION}",
  "pub_date": "${PUB_DATE}",
  "platforms": {
    "darwin-aarch64": {
      "signature": "${SIGNATURE}",
      "url": "https://github.com/${REPO}/releases/download/${TAG}/${APP_TAR_FILENAME}"
    },
    "darwin-x86_64": {
      "signature": "${SIGNATURE}",
      "url": "https://github.com/${REPO}/releases/download/${TAG}/${APP_TAR_FILENAME}"
    }
  }
}
EOF

echo "==> Generated latest.json"

# Create GitHub release and upload artifacts
echo "==> Creating GitHub release ${TAG}..."
gh release create "$TAG" \
  --repo "$REPO" \
  --title "OpenSlaq Desktop ${VERSION}" \
  --notes "Desktop app release ${VERSION}" \
  "$DMG" \
  "$APP_TAR" \
  "$APP_SIG"

# Update the stable desktop-latest release with latest.json for auto-updater
echo "==> Updating desktop-latest release with latest.json..."
if gh release view desktop-latest --repo "$REPO" &>/dev/null; then
  gh release delete-asset desktop-latest latest.json --repo "$REPO" --yes 2>/dev/null || true
  gh release upload desktop-latest latest.json --repo "$REPO"
else
  gh release create desktop-latest \
    --repo "$REPO" \
    --title "Desktop Latest (auto-updater)" \
    --notes "This release holds latest.json for the Tauri auto-updater. Do not delete." \
    --prerelease \
    latest.json
fi

rm -f latest.json

echo "==> Released ${TAG} to https://github.com/${REPO}/releases/tag/${TAG}"
