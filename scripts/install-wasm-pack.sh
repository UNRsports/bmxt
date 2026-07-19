#!/usr/bin/env bash
# EN: Install a pinned wasm-pack release binary into ~/.cargo/bin (or $CARGO_HOME/bin).
# JA: 固定バージョンの wasm-pack バイナリを ~/.cargo/bin（または $CARGO_HOME/bin）へ入れる。
set -euo pipefail

VERSION="${WASM_PACK_VERSION:-0.15.0}"
REPO="wasm-bindgen/wasm-pack"
PREFIX="${CARGO_HOME:-$HOME/.cargo}"
BIN_DIR="$PREFIX/bin"
mkdir -p "$BIN_DIR"

os="$(uname -s)"
arch="$(uname -m)"
case "$os-$arch" in
  Linux-x86_64) target="x86_64-unknown-linux-musl" ;;
  Linux-aarch64) target="aarch64-unknown-linux-musl" ;;
  Darwin-x86_64) target="x86_64-apple-darwin" ;;
  Darwin-arm64) target="aarch64-apple-darwin" ;;
  *)
    echo "unsupported platform: $os $arch (install wasm-pack $VERSION manually)" >&2
    exit 1
    ;;
esac

asset="wasm-pack-v${VERSION}-${target}.tar.gz"
url="https://github.com/${REPO}/releases/download/v${VERSION}/${asset}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "installing wasm-pack ${VERSION} (${target})"
curl -fsSL -o "$tmp/$asset" "$url"
tar -xzf "$tmp/$asset" -C "$tmp"
found="$(find "$tmp" -type f -name wasm-pack | head -n 1)"
if [[ -z "$found" ]]; then
  echo "wasm-pack binary not found in $asset" >&2
  exit 1
fi
install -m 755 "$found" "$BIN_DIR/wasm-pack"
"$BIN_DIR/wasm-pack" --version
