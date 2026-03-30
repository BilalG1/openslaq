#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.production"
MOBILE_DIR="$REPO_ROOT/apps/mobile"
WORKSPACE="$MOBILE_DIR/ios/OpenSlaq.xcworkspace"
SCHEME="OpenSlaq"
ARCHIVE_PATH="$MOBILE_DIR/ios/build/OpenSlaq.xcarchive"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | xargs)

# Step 1: Prebuild
echo "==> Prebuild with production env vars"
cd "$MOBILE_DIR"
npx expo prebuild --platform ios --clean

# Step 2: Fix settings that prebuild resets
ENTITLEMENTS="ios/OpenSlaq/OpenSlaq.entitlements"
sed -i '' 's|<string>development</string>|<string>production</string>|' "$ENTITLEMENTS"
echo "==> Set aps-environment to production"

# Step 3: Archive (pass DEVELOPMENT_TEAM as build setting since prebuild doesn't include it)
echo "==> Archiving..."
xcodebuild -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM=STXVU374Z3 \
  CODE_SIGN_STYLE=Automatic \
  archive

# Step 4: Export IPA
EXPORT_PATH="$MOBILE_DIR/ios/build/export"
echo "==> Exporting IPA..."
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$REPO_ROOT/scripts/release/ExportOptions.plist" \
  -exportPath "$EXPORT_PATH" \
  -allowProvisioningUpdates

# Step 5: Upload to App Store Connect (TestFlight)
# Requires App Store Connect API key at ~/.appstoreconnect/private_keys/AuthKey_BB7M563SKY.p8
echo "==> Uploading to TestFlight..."
xcrun altool --upload-app \
  -f "$EXPORT_PATH/OpenSlaq.ipa" \
  -t ios \
  --apiKey BB7M563SKY \
  --apiIssuer 13b483c7-e341-4f32-a9b7-b0b47a79dd09

echo "==> Done! Check App Store Connect for the build."
