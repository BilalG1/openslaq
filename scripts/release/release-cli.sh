#!/usr/bin/env bash
set -euo pipefail

# Release the CLI: build cross-platform binaries and create a GitHub release.
# Usage: ./scripts/release/release-cli.sh <version>
# Example: ./scripts/release/release-cli.sh 0.3.0

VERSION="${1:-$(bun -e "console.log(require('./apps/cli/package.json').version)")}"

TAG="cli-v${VERSION}"

echo "Building CLI binaries..."
bun run --filter @openslaq/cli build:compile

echo "Creating GitHub release ${TAG}..."
gh release create "$TAG" \
  --generate-notes \
  --title "CLI ${VERSION}" \
  apps/cli/dist/openslaq-darwin-arm64 \
  apps/cli/dist/openslaq-darwin-x64 \
  apps/cli/dist/openslaq-linux-x64 \
  apps/cli/dist/openslaq-linux-arm64

echo "Done! https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/releases/tag/${TAG}"
