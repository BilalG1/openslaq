#!/bin/sh
set -eu

REPO="bilalg1/openslaq"
BINARY_NAME="openslaq"

main() {
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"

  case "$os" in
    darwin) ;;
    linux) ;;
    *)
      echo "Error: Unsupported OS: $os" >&2
      exit 1
      ;;
  esac

  case "$arch" in
    x86_64|amd64) arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *)
      echo "Error: Unsupported architecture: $arch" >&2
      exit 1
      ;;
  esac

  asset="${BINARY_NAME}-${os}-${arch}"

  # Fetch the latest cli-v* release (not /releases/latest which may be a desktop release)
  cli_tag="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases" \
    | grep -o '"tag_name": *"cli-v[^"]*"' \
    | head -1 \
    | grep -o 'cli-v[^"]*')" || true

  if [ -z "$cli_tag" ]; then
    echo "Error: No CLI release found at https://github.com/${REPO}/releases" >&2
    exit 1
  fi

  url="https://github.com/${REPO}/releases/download/${cli_tag}/${asset}"

  echo "Downloading ${asset}..."

  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT

  if ! curl -fsSL -o "${tmpdir}/${BINARY_NAME}" "$url"; then
    echo "Error: Failed to download ${url}" >&2
    echo "Check that a release exists at https://github.com/${REPO}/releases" >&2
    exit 1
  fi

  chmod +x "${tmpdir}/${BINARY_NAME}"

  install_dir="/usr/local/bin"
  if [ ! -w "$install_dir" ] 2>/dev/null; then
    install_dir="${HOME}/.local/bin"
    mkdir -p "$install_dir"
  fi

  mv "${tmpdir}/${BINARY_NAME}" "${install_dir}/${BINARY_NAME}"

  version="$("${install_dir}/${BINARY_NAME}" --version 2>/dev/null || echo "unknown")"

  echo ""
  echo "OpenSlaq CLI ${version} installed to ${install_dir}/${BINARY_NAME}"

  case ":$PATH:" in
    *":${install_dir}:"*) ;;
    *)
      echo ""
      echo "Add ${install_dir} to your PATH:"
      echo "  export PATH=\"${install_dir}:\$PATH\""
      ;;
  esac
}

main
