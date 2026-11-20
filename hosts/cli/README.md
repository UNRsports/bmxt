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
cargo test -p bmxt-ui-settings
cargo test -p bmxt-family -p bmxt-sync-wire
```

## Config

`~/.config/bmxt/config.json` — device id, display name (`terminal@…`), Family seed, optional **`handshakeDelivery`** (`code`|`file`) and **`handshakeTicketDir`**.  
Command history: `~/.config/bmxt/history`.

Outbound sync tickets (`sync -setup` invite · `sync -offer` / `-accept` answer): on first use the CLI asks **code vs file**; file mode confirms a directory and remembers it. Change later with `setting -set handshake-delivery …` / `setting -set handshake-ticket-dir …` (or `handshake-delivery ask` to be prompted again).

**UI settings (BMXtCLI):** `~/.config/bmxt/bmxt-cli-ui-settings/settings.json`  
(extension export–compatible v2 layout; independent of `chrome.storage` / FSA). Override directory with `BMXT_CLI_UI_SETTINGS_DIR`. Locale priority: **committed `settings.locale` → env (`LANG` / `LC_*`) → `en`**.

### `setting` on CLI

Same grammar as the extension (`bmxt-core`):

- `setting -list` — print committed (or draft) scalar fields
- `setting -set <key> <value>` — patch in-memory draft (`locale` · `edit-picker` · `ime-candidate-help` · `search-legend` · `host-ui`)
- `setting -save` / `setting -cancel` — commit draft to disk / discard
- `setting -list | browse` — **not supported** on CLI (use `-set`/`-save` or the browser window)

## Quick start (same PC · host ICE)

1. Install / open **BMXt extension** and keep the **prompt window** open (peer host).
2. Join the **same Family** on CLI and each browser (`sync -setup` / `sync -pair`).
3. **Direct start:** `bmxt` or `bmxt repl` → when Family is joined, CLI opens a **localhost HTTP listener** on `http://127.0.0.1:17653/` (loopback only, Family-authenticated). Open the BMXt prompt in each browser — Family-authenticated **auto-reconnect** runs in the background.
4. **Fallback handshake** (clipboard / file) still works: `sync -offer` / `sync -accept` (Enter/`:pick`), or `bmxt sync-connect [--offer]`. Prefer ticket files under `~/.config/bmxt/`.
5. With Family joined the prompt is **`BMXt>`** (accepting commands; peers may still be connecting). Extra browsers mesh automatically after the first CLI link. Unjoined Family uses `BMXt*>`.
6. Connection events print as normal log lines; while `BMXt>` is waiting, logs use rustyline’s external printer so the prompt and caret redraw afterward.
7. REPL uses the **same command grammar as the extension** (via `bmxt-core`), with a Rust line editor:
   - **↑↓** command history · **grey remainder hint** (e.g. typed `sync -se` + grey `tup`) · **Tab** applies · **Enter** runs
   - Tab after `-list` offers `| browse`…; after a typed `|`, Tab completes `browse` / `close` / …
   - `tab -list` · `tab -list -url --peers` · `tab -list --peers | browse` (picker: ↑↓ `/` Enter activates on the owning peer, stays open until q/Esc)
   - **`quit` / `exit`** ends the `bmxt` process (peer drop while the REPL stays up only prints a “listener keeps running” notice)
   - `sync -setup` · `sync -pair [invite]` · `sync -status` · `sync -members` · `sync -ping <deviceId>`
   - First peer: `sync -offer` / `sync -accept` (or `bmxt sync-connect`); extra peers join via mesh
   - `https://example.com` (open on a connected peer) · `help` · `quit`
   - `setting -list` · `setting -set locale en` · `setting -save`
   - Alias: bare `ping` → `sync -ping` against the first connected peer

## Layout

| Path | Role |
|------|------|
| `hosts/cli` | `bmxt` binary (this package) |
| `shared/crates/bmxt-family` | Family auth (sealed envelope) / invite / `bmxt-rtc1.` |
| `shared/crates/bmxt-sync-wire` | `SyncBusCommand` |
| `shared/crates/bmxt-peer-rtc` | Native WebRTC (host ICE) |
| `shared/crates/bmxt-core` | Shared command grammar (`default-features = false` for CLI) |
| `shared/crates/bmxt-ui-settings` | CLI `settings.json` v2 load/save/normalize |

Contract: [`_context/cli-peer/CONTRACT.md`](../../_context/cli-peer/CONTRACT.md). Product checklist: `_context/todo.md` §10 / §12–§14. Root overview: [Terminal CLI peer](../../README.md#terminal-cli-peer).

## POSIX I/O + `bmxt exec` (todo §13 / §14)

Same **BMXt POSIX Profile** as the extension: stdout = results, stderr = diagnostics, exit = `0` / `1` / `2` / `127` (completion buffer). REPL is **Interactive**; `exec` is **NonInteractive** (no ask / zenity / `| browse`).

```bash
# Terminal A — resident (Family joined → door on :17653)
bmxt

# Terminal B — oneshot (LLM / scripts)
bmxt exec -- 'sync -status'
bmxt exec -- 'tab -list --peers'
bmxt exec -- 'help'          # local grammar; no peer required once door is up
# no resident → stderr + exit 1 (does not hang)
```

IPC: `POST http://127.0.0.1:17653/v1/exec` with `{ "line": "…" }` → `{ stdout, stderr, exitStatus }`.

**Agents (Gemini CLI, etc.):** `bmxt exec` is a **CLI subcommand** (new process → HTTP POST), **not** the shell builtin `exec` and **not** an attach to the resident TTY. Use your normal shell tool with the full argv above. See root README **Using BMXtCLI with an LLM**.

## Out of scope (this host)

- `nav` / `dom` page overlays
- `setting -list | browse` picker / FSA / chrome.storage mirror
- Native messaging / CDP / Playwright
- Public STUN/TURN on the default path
- Replacing the extension’s in-page `RTCPeerConnection`
- True incremental chunk delivery over exec IPC (buffered oneshot only)

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
cargo test -p bmxt-ui-settings
cargo test -p bmxt-family -p bmxt-sync-wire
```

## 設定

`~/.config/bmxt/config.json` — device id · 表示名（`terminal@…`）· Family シード · 任意の **`handshakeDelivery`**（`code`|`file`）と **`handshakeTicketDir`**。  
コマンド履歴: `~/.config/bmxt/history`。

送信チケット（`sync -setup` 招待 · `sync -offer` / `-accept` の answer）: 初回は **コード表示かファイル保存か** を尋ね、ファイル時は保存先を確認して記憶する。後から `setting -set handshake-delivery …` / `setting -set handshake-ticket-dir …`（再質問は `handshake-delivery ask`）。

**UI 設定（BMXtCLI）:** `~/.config/bmxt/bmxt-cli-ui-settings/settings.json`  
（拡張 export と同形の v2。`chrome.storage` / FSA とは独立）。ディレクトリ上書きは `BMXT_CLI_UI_SETTINGS_DIR`。locale 優先順: **committed `settings.locale` → env（`LANG` / `LC_*`）→ `en`**。

### CLI の `setting`

拡張と同じ文法（`bmxt-core`）:

- `setting -list` — committed（または下書き）スカラーを印刷
- `setting -set <key> <value>` — インメモリ下書き（`locale` · `edit-picker` · `ime-candidate-help` · `search-legend` · `host-ui`）
- `setting -save` / `setting -cancel` — ディスクへ保存 / 破棄
- `setting -list | browse` — **CLI 非対応**（`-set`/`-save` か拡張窓を使う）

## クイックスタート（同一 PC · host ICE）

1. **BMXt 拡張**を入れ、**プロンプト窓**を開いたままにする（peer 宿主）。
2. CLI と各ブラウザで **同じ Family** に参加（`sync -setup` / `sync -pair`）。
3. **直接起動:** `bmxt` または `bmxt repl` → Family 参加済みなら **localhost HTTP 待ち受け** `http://127.0.0.1:17653/`（loopback のみ・Family 認証付き）。各ブラウザで BMXt プロンプトを開くと **自動再接続**が走る。
4. **フォールバック握手**（コピペ／ファイル）も従来どおり: `sync -offer` / `sync -accept`（Enter / `:pick`）、または `bmxt sync-connect [--offer]`。`~/.config/bmxt/` のチケット推奨。
5. Family 参加済みならプロンプトは **`BMXt>`**（コマンド受付中。peer 接続は並行しうる）。追加ブラウザは CLI 経由の mesh で自動直結。未参加時は `BMXt*>`。
6. 接続イベントは通常のログ行として流す。`BMXt>` 待ち中は rustyline の external printer 経由で出し、ログ後にプロンプトとキャレットを描き直す。
7. REPL は拡張と **同じコマンド文法**（`bmxt-core`）+ Rust 行編集:
   - **↑↓** 履歴 · **灰色の残りヒント**（例: 入力 `sync -se` ＋ 灰色 `tup`）· **Tab** で適用 · **Enter** で実行
   - `-list` 後の Tab で `| browse` 等、既に `|` を打った右辺では `browse` / `close` 等を補完
   - `tab -list` · `tab -list -url --peers` · `tab -list --peers | browse`（ピッカー: ↑↓ `/` Enter で所有 peer へ activate、q/Esc まで開いたまま）
   - **`quit` / `exit`** で `bmxt` プロセス終了（REPL 継続中のピア切断時のみ「待ち受け継続」案内）
   - `sync -setup` · `sync -pair [invite]` · `sync -status` · `sync -members` · `sync -ping <deviceId>`
   - 最初の peer: `sync -offer` / `sync -accept`（または `bmxt sync-connect`）。追加 peer はメッシュ
   - `https://example.com`（接続ピアで開く）· `help` · `quit`
   - `setting -list` · `setting -set locale en` · `setting -save`
   - 別名: 裸の `ping` → 先頭の接続ピアへ `sync -ping`

## 配置

| パス | 役割 |
|------|------|
| `hosts/cli` | `bmxt` バイナリ（本パッケージ） |
| `shared/crates/bmxt-family` | Family 認証（sealed envelope）/ 招待 / `bmxt-rtc1.` |
| `shared/crates/bmxt-sync-wire` | `SyncBusCommand` |
| `shared/crates/bmxt-peer-rtc` | ネイティブ WebRTC（host ICE） |
| `shared/crates/bmxt-core` | 共有コマンド文法（CLI は `default-features = false`） |
| `shared/crates/bmxt-ui-settings` | CLI `settings.json` v2 の load/save/normalize |

契約: [`_context/cli-peer/CONTRACT.md`](../../_context/cli-peer/CONTRACT.md)。製品チェックリスト: `_context/todo.md` §10 / §12–§14。概要: [端末 CLI peer](../../README.md#terminal-cli-peer-ja)。

## POSIX I/O + `bmxt exec`（todo §13 / §14）

拡張と同じ **BMXt POSIX Profile**（stdout=結果 · stderr=診断 · exit=`0`/`1`/`2`/`127` · 完了バッファ）。REPL は **Interactive**、`exec` は **NonInteractive**（ask / zenity / `| browse` 禁止）。

```bash
bmxt
bmxt exec -- 'sync -status'
bmxt exec -- 'tab -list --peers'
```

IPC: `POST http://127.0.0.1:17653/v1/exec`。

**エージェント（Gemini CLI 等）:** `bmxt exec` は **CLI サブコマンド**（新プロセス → HTTP POST）であり、**シェル組み込み `exec` でも常駐 TTY へのアタッチでもない**。通常のシェルツールで上記のフル argv を実行すること。root README **BMXtCLI を LLM で使う** を参照。

## この host の対象外

- `nav` / `dom` のページオーバーレイ
- `setting -list | browse` ピッカー / FSA / chrome.storage ミラー
- ネイティブメッセージング / CDP / Playwright
- 既定経路での公開 STUN/TURN
- 拡張のページ内 `RTCPeerConnection` の置き換え
- exec IPC の真のインクリメンタル配信（バッファ・ワンショットのみ）
