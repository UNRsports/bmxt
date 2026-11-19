# hosts/cli — BMXt terminal peer

> **English** first · **[日本語](#japanese)** below.

Rust-only Family peer that talks to the browser extension over **WebRTC DataChannel** (same bus as todo §6c / §10). No native messaging.

## Build

Requires a C toolchain (`gcc` / `cc`) for the `webrtc` → `ring` dependency.

```bash
# from repo root
cargo build -p bmxt-cli
# release binary:
cargo build --release -p bmxt-cli
# → target/release/bmxt
```

Tests (no WebRTC):

```bash
cargo test -p bmxt-cli
cargo test -p bmxt-family -p bmxt-sync-wire
```

## Config

`~/.config/bmxt/config.json` — device id, display name (`terminal@…`), Family seed.  
Command history: `~/.config/bmxt/history`.

## Quick start (same PC · host ICE)

1. Install / open **BMXt extension** and keep the **prompt window** open (peer host).
2. Join the **same Family** on CLI and each browser (`sync -setup` / `sync -pair`).
3. **Direct start:** `bmxt` or `bmxt repl` → when Family is joined, CLI opens a **localhost door** on `http://127.0.0.1:17653/` (loopback only, Family-sealed). Open the BMXt prompt in each browser — sealed **auto-reconnect** runs in the background.
4. **Fallback handshake** (clipboard / file) still works: `sync -offer` / `sync -accept` (Enter/`:pick`), or `bmxt sync-connect [--offer]`. Prefer ticket files under `~/.config/bmxt/`.
5. After any peer connects the prompt becomes `bmxt>`. Extra browsers mesh automatically after the first CLI link.
6. REPL uses the **same command grammar as the extension** (via `bmxt-core`), with a Rust line editor:
   - **↑↓** command history · **grey remainder hint** (e.g. typed `sync -se` + grey `tup`) · **Tab** applies · **Enter** runs
   - `tab -list` · `tab -list -url --peers` · `tab -list --peers | browse` (picker: ↑↓ `/` Enter activates)
   - `sync -setup` · `sync -pair [invite]` · `sync -status` · `sync -members` · `sync -ping <deviceId>`
   - First peer: `sync -offer` / `sync -accept` (or `bmxt sync-connect`); extra peers join via mesh
   - `https://example.com` (open on a connected peer) · `help` · `quit`
   - Alias: bare `ping` → `sync -ping` against the first connected peer

## Layout

| Path | Role |
|------|------|
| `hosts/cli` | `bmxt` binary (this package) |
| `shared/crates/bmxt-family` | Family seal / invite / `bmxt-rtc1.` |
| `shared/crates/bmxt-sync-wire` | `SyncBusCommand` |
| `shared/crates/bmxt-peer-rtc` | Native WebRTC (host ICE) |
| `shared/crates/bmxt-core` | Shared command grammar (`default-features = false` for CLI) |

Contract: [`_context/cli-peer/CONTRACT.md`](../../_context/cli-peer/CONTRACT.md). Product checklist: `_context/todo.md` §10. Root overview: [Terminal CLI peer](../../README.md#terminal-cli-peer).

## Out of scope (this host)

- `nav` / `dom` page overlays
- Native messaging / CDP / Playwright
- Public STUN/TURN on the default path
- Replacing the extension’s in-page `RTCPeerConnection`

---

<a id="japanese"></a>

# hosts/cli — BMXt 端末 peer

拡張と同じ **WebRTC DataChannel**（todo §6c / §10 のバス）でつながる Rust 専用 Family peer。ネイティブメッセージングは使わない。

## ビルド

`webrtc` → `ring` 依存のため C ツールチェーン（`gcc` / `cc`）が必要。

```bash
# リポジトリルートから
cargo build -p bmxt-cli
# リリース:
cargo build --release -p bmxt-cli
# → target/release/bmxt
```

テスト（WebRTC なし）:

```bash
cargo test -p bmxt-cli
cargo test -p bmxt-family -p bmxt-sync-wire
```

## 設定

`~/.config/bmxt/config.json` — device id · 表示名（`terminal@…`）· Family シード。  
コマンド履歴: `~/.config/bmxt/history`。

## クイックスタート（同一 PC · host ICE）

1. **BMXt 拡張**を入れ、**プロンプト窓**を開いたままにする（peer 宿主）。
2. CLI と各ブラウザで **同じ Family** に参加（`sync -setup` / `sync -pair`）。
3. **直接起動:** `bmxt` または `bmxt repl` → Family 参加済みなら **localhost 玄関** `http://127.0.0.1:17653/`（loopback のみ・Family 封印）。各ブラウザで BMXt プロンプトを開くと封印 **自動再接続**が走る。
4. **フォールバック握手**（コピペ／ファイル）も従来どおり: `sync -offer` / `sync -accept`（Enter / `:pick`）、または `bmxt sync-connect [--offer]`。`~/.config/bmxt/` のチケット推奨。
5. いずれかの peer 接続後はプロンプト `bmxt>`。追加ブラウザは CLI 経由の mesh で自動直結。
6. REPL は拡張と **同じコマンド文法**（`bmxt-core`）+ Rust 行編集:
   - **↑↓** 履歴 · **灰色の残りヒント**（例: 入力 `sync -se` ＋ 灰色 `tup`）· **Tab** で適用 · **Enter** で実行
   - `tab -list` · `tab -list -url --peers` · `tab -list --peers | browse`（ピッカー: ↑↓ `/` Enter で activate）
   - `sync -setup` · `sync -pair [invite]` · `sync -status` · `sync -members` · `sync -ping <deviceId>`
   - 最初の peer: `sync -offer` / `sync -accept`（または `bmxt sync-connect`）。追加 peer はメッシュ
   - `https://example.com`（接続ピアで開く）· `help` · `quit`
   - 別名: 裸の `ping` → 先頭の接続ピアへ `sync -ping`

## 配置

| パス | 役割 |
|------|------|
| `hosts/cli` | `bmxt` バイナリ（本パッケージ） |
| `shared/crates/bmxt-family` | Family seal / 招待 / `bmxt-rtc1.` |
| `shared/crates/bmxt-sync-wire` | `SyncBusCommand` |
| `shared/crates/bmxt-peer-rtc` | ネイティブ WebRTC（host ICE） |
| `shared/crates/bmxt-core` | 共有コマンド文法（CLI は `default-features = false`） |

契約: [`_context/cli-peer/CONTRACT.md`](../../_context/cli-peer/CONTRACT.md)。製品チェックリスト: `_context/todo.md` §10。概要: [端末 CLI peer](../../README.md#terminal-cli-peer-ja)。

## この host の対象外

- `nav` / `dom` のページオーバーレイ
- ネイティブメッセージング / CDP / Playwright
- 既定経路での公開 STUN/TURN
- 拡張のページ内 `RTCPeerConnection` の置き換え
