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
2. **Direct start** (no handshake yet): `bmxt` or `bmxt repl` → prompt `bmxt*>`. Local commands work immediately (`sync -setup`, `sync -pair`, `sync -status`, `help`). Connect later with `sync -offer` / `sync -accept` (Enter/`:pick` for offer file). After connect the prompt becomes `bmxt>`.
3. Or start already connected: `bmxt sync-connect [--offer]` (same handshake as below).
4. Join the same Family:
   - Browser: `sync -setup` / invite
   - CLI (outside or **inside** REPL): `bmxt sync-setup` / `sync -setup`, or `bmxt sync-pair '<bmxt1.…>'` / `sync -pair …`
5. Handshake (subcommand **or** from inside a direct-start REPL):
   - CLI offers: `bmxt sync-connect --offer` or REPL `sync -offer` → paste offer into BMXt wizard → paste answer back into CLI
   - Or CLI answers: `bmxt sync-connect` or REPL `sync -accept` → paste offer from BMXt → paste answer into BMXt
   - **Prefer files:** offer writes `~/.config/bmxt/bmxt-*-offer.json` (clickable `file://` OSC-8 link when the terminal supports it). In BMXt use ファイルで渡す / Open, then at the CLI answer prompt use `@/path/to/bmxt-*-answer.json`, **Enter / `:pick`** for a GUI dialog (`zenity` or `kdialog`), or a bare `bmxt-rtc1.…` paste (long bare pastes often corrupt).
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
2. **直接起動**（まだ握手しない）: `bmxt` または `bmxt repl` → プロンプト `bmxt*>`。ローカル操作（`sync -setup` · `sync -pair` · `sync -status` · `help`）はそのまま可。あとから `sync -offer` / `sync -accept`（Enter / `:pick` で offer ファイル選択）で接続。接続後は `bmxt>`。
3. 最初から接続して起動: `bmxt sync-connect [--offer]`（下記と同じ握手）。
4. 同じ Family に参加:
   - ブラウザ: `sync -setup` / 招待
   - CLI（外でも **REPL 内でも**）: `bmxt sync-setup` / `sync -setup`、または `bmxt sync-pair '<bmxt1.…>'` / `sync -pair …`
5. 握手（サブコマンド **または** 直接起動 REPL 内）:
   - CLI が offer: `bmxt sync-connect --offer` または REPL `sync -offer` → BMXt ウィザードへ offer → answer を CLI へ
   - CLI が answer: `bmxt sync-connect` または REPL `sync -accept` → BMXt の offer を受け → answer を BMXt へ
   - **ファイル推奨:** offer は `~/.config/bmxt/bmxt-*-offer.json`（対応端末では OSC-8 の `file://` リンク）。BMXt では「ファイルで渡す / Open」。CLI の answer プロンプトでは `@/path/to/….json`、**Enter / `:pick`**（`zenity` / `kdialog`）、または素の `bmxt-rtc1.…`（長い素貼付は端末で化けやすい）。
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
