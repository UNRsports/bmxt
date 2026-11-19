# Host packages (Chrome / Firefox / CLI)

> **English** first · **[日本語](#japanese)** below.

| Path | Role |
|------|------|
| [`../shared/`](../shared/) | Shared extension source (entrypoints, `lib/`, Rust/WASM, public assets, command manifest) |
| [`chrome/`](chrome/) | Chrome MV3 WXT config (`pnpm run build:chrome`; `verify` / CWS) |
| [`firefox/`](firefox/) | Firefox MV3 WXT config + [AMO source kit](firefox/AMO_SOURCE.md) |
| [`cli/`](cli/) | Terminal Family peer (`bmxt` binary; WebRTC DataChannel → extension). See [`cli/README.md`](cli/README.md) · `_context/todo.md` §10 · root README [Terminal CLI peer](../README.md#terminal-cli-peer) |

WXT `root` is **`shared/`** for both browser hosts (entrypoints must live under the WXT project root). Browser-specific packaging stays under `hosts/*`. The CLI host is a separate Cargo package (`bmxt-cli`) and does not use WXT.

```bash
pnpm run build            # both → chrome-mv3 + firefox-mv3
pnpm run build:chrome     # .output/chrome-mv3
pnpm run build:firefox    # .output/firefox-mv3
pnpm run package          # chrome zip + firefox zip + firefox AMO sources tarball
pnpm run package:chrome   # .output/bmxt-<ver>-chrome.zip
pnpm run package:firefox  # .output/bmxt-<ver>-firefox.zip + …-firefox-sources.tar.gz

# Terminal peer (Rust; not part of pnpm build)
cargo build -p bmxt-cli
cargo build --release -p bmxt-cli   # → target/release/bmxt
```

---

<a id="japanese"></a>

# ホストパッケージ（Chrome / Firefox / CLI）

| パス | 役割 |
|------|------|
| [`../shared/`](../shared/) | 共有拡張ソース（entrypoints · `lib/` · Rust/WASM · 静的資産 · コマンド manifest） |
| [`chrome/`](chrome/) | Chrome MV3 用 WXT 設定（`pnpm run build:chrome` · `verify` / CWS） |
| [`firefox/`](firefox/) | Firefox MV3 用 WXT 設定 + [AMO ソースキット](firefox/AMO_SOURCE.md) |
| [`cli/`](cli/) | 端末 Family peer（`bmxt` バイナリ · WebRTC DataChannel → 拡張）。詳細は [`cli/README.md`](cli/README.md) · `_context/todo.md` §10 · ルート README [端末 CLI peer](../README.md#terminal-cli-peer-ja) |

ブラウザ host の WXT `root` は **`shared/`**（entrypoint は WXT プロジェクトルート配下に置く）。ブラウザ固有のパッケージングは `hosts/*` に閉じる。CLI host は別 Cargo パッケージ（`bmxt-cli`）で、WXT は使わない。

```bash
pnpm run build            # Chrome + Firefox → chrome-mv3 + firefox-mv3
pnpm run build:chrome     # .output/chrome-mv3
pnpm run build:firefox    # .output/firefox-mv3
pnpm run package          # chrome zip + firefox zip + firefox AMO sources tarball
pnpm run package:chrome   # .output/bmxt-<ver>-chrome.zip
pnpm run package:firefox  # .output/bmxt-<ver>-firefox.zip + …-firefox-sources.tar.gz

# 端末 peer（Rust · pnpm build には含まれない）
cargo build -p bmxt-cli
cargo build --release -p bmxt-cli   # → target/release/bmxt
```
