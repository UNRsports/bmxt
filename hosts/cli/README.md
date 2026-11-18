# hosts/cli — BMXt terminal peer

Rust-only Family peer that talks to the browser extension over **WebRTC DataChannel** (same bus as §6c). No native messaging.

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
cargo test -p bmxt-family -p bmxt-sync-wire
```

## Config

`~/.config/bmxt/config.json` — device id, display name (`terminal@…`), Family seed.

## Quick start (same PC · host ICE)

1. Install / open **BMXt extension** and keep the **prompt window** open (peer host).
2. Join the same Family:
   - Browser: `sync -setup` / invite
   - CLI: `bmxt sync-setup` then share invite, or `bmxt sync-pair '<bmxt1.…>'`
3. Handshake:
   - CLI offers: `bmxt sync-connect --offer` → paste offer into BMXt wizard → paste answer back into CLI
   - Or CLI answers: `bmxt sync-connect` → paste offer from BMXt → paste answer into BMXt
   - **Prefer files:** `sync-connect --offer` writes `~/.config/bmxt/bmxt-*-offer.json`. In BMXt use ファイルで渡す / Open, then save the answer JSON and pass `@/path/to/bmxt-*-answer.json` to the CLI. Long bare `bmxt-rtc1.…` pastes often corrupt in the terminal.
4. REPL: `ping` · `tabs` · `tabs --url` · `open <url>` · `close <tabId>` · `activate <tabId> <windowId>` · `search <dispatchLine>` · `tui` · `quit`

## Layout

| Path | Role |
|------|------|
| `hosts/cli` | `bmxt` binary (this package) |
| `shared/crates/bmxt-family` | Family seal / invite / `bmxt-rtc1.` |
| `shared/crates/bmxt-sync-wire` | `SyncBusCommand` |
| `shared/crates/bmxt-peer-rtc` | Native WebRTC (host ICE) |

Contract: [`_context/cli-peer/CONTRACT.md`](../../_context/cli-peer/CONTRACT.md). Product checklist: `_context/todo.md` §10.

## Out of scope (this host)

- `nav` / `dom` page overlays
- Native messaging / CDP / Playwright
- Public STUN/TURN on the default path
- Replacing the extension’s in-page `RTCPeerConnection`
