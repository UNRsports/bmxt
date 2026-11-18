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
2. **Direct start** (no handshake yet): `bmxt` or `bmxt repl` → prompt `bmxt*>`. Local commands work immediately (`sync -setup`, `sync -pair`, `sync -status`, `help`). Connect later with `sync -offer` / `sync -accept` (Enter/`:pick` for offer file). After connect the prompt becomes `bmxt>`.
3. Or start already connected: `bmxt sync-connect [--offer]` (same handshake as below).
4. Join the same Family:
   - Browser: `sync -setup` / invite
   - CLI (outside or **inside** REPL): `bmxt sync-setup` / `sync -setup`, or `bmxt sync-pair '<bmxt1.…>'` / `sync -pair …`
5. Handshake (subcommand **or** from inside a direct-start REPL):
   - CLI offers: `bmxt sync-connect --offer` or REPL `sync -offer` → paste offer into BMXt wizard → paste answer back into CLI
   - Or CLI answers: `bmxt sync-connect` or REPL `sync -accept` → paste offer from BMXt → paste answer into BMXt
   - **Prefer files:** offer writes `~/.config/bmxt/bmxt-*-offer.json` (clickable `file://` OSC-8 link when supported). In BMXt use ファイルで渡す / Open, then at the CLI answer prompt use `@/path/to/bmxt-*-answer.json`, **Enter / `:pick`** for a GUI dialog (`zenity` or `kdialog`), or a bare `bmxt-rtc1.…` paste (long bare pastes often corrupt).
6. REPL uses the **same command grammar as the extension** (via `bmxt-core`), with a Rust line editor:
   - **↑↓** command history (`~/.config/bmxt/history`) · grey remainder hint (e.g. `sync -se` + grey `tup`) · **Tab** applies · **Enter** runs (same fixed-token SoT as extension)
   - `tab -list` · `tab -list -url --peers` · `tab -list --peers | browse` (picker: ↑↓ `/` Enter activates)
   - `sync -setup` · `sync -pair [invite]` · `sync -status` · `sync -members` · `sync -ping <deviceId>`
   - First-peer RTC (`sync -offer` / `-answer` / `-accept`) still uses `bmxt sync-connect`; extra peers join via mesh
   - `https://example.com` (open on a connected peer) · `help` · `quit`
   - Alias: bare `ping` → `sync -ping` against the first connected peer

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
