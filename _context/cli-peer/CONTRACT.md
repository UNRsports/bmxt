# CLI peer ↔ Extension contract (todo §10 / §13 / §14)

SoT for the terminal BMXt peer. Initial version does **not** break wire fields.

## Transport

| Item | Value |
|------|--------|
| Path | WebRTC DataChannel, ordered, label `bmxt-sync` |
| ICE | Host candidates only (`iceServers: []`) on local path |
| Signaling | **Primary (todo §11):** CLI loopback HTTP listener `http://127.0.0.1:17653` (Family-authenticated hello + `bmxt-rtc1.` offer/answer). **Fallback:** copy-paste / file tickets (unchanged) |
| Door bind | `127.0.0.1` only · port **17653** · `GET /v1/hello` · `POST /v1/handshake/offer` · `POST /v1/exec` |
| Peer host (extension) | BMXt prompt window only |
| Native messaging | Forbidden |

## Family crypto (`family-crypto.ts`)

| Item | Value |
|------|--------|
| Seed | 32 bytes, base64url (no padding) |
| HKDF | SHA-256, salt empty, info UTF-8 `bmxt-family-sync-v1` |
| Cipher | AES-256-GCM, IV 12 bytes, ciphertext\|\|tag in `ciphertextB64` |
| Envelope | `SyncSealedEnvelope` version `1` |
| Handshake prefix | `bmxt-rtc1.` + base64url(UTF-8 JSON envelope) |
| Invite prefix | `bmxt1.` + base64url(UTF-8 JSON `SyncInviteV1`) (not sealed) |

## Bus

- Message body: UTF-8 JSON `SyncBusCommand` (see `shared/lib/features/sync/types.ts`).
- Soft size / timeouts: align with `remote-query-limits` / search wire soft cap.
- Inbound max (extension): 200_000 UTF-16 code units per DataChannel text message.
- Bookmark / history (todo **§16**): CLI has no local browser inventory. Bare `bookmark -list` / `history -list` fan out via existing **`search_query`** (flat). `bookmark -send --open|--save|--both` uses **`open_tabs`** / **`bookmarks_import`**. Peer BM mutate uses **`bookmarks_ops`** (create / create_folder / remove / move). Peer history delete is **out of scope**. Folder/date tree TUI and dedicated `bookmarks_list` RPC are **§16.7** (later).
- **`--device` source pick:** `--device <id>` oneshot lists that peer. Bare `--device` (no id) is a valid plan; plain run → exit **2**; Interactive `| browse` → numbered connected-peer pick, then the existing URL/tab picker. Same for `tab` / `bookmark` / `history` / `search -list`.
- **§17 RPC:** `probe_capabilities` / `dom_list` / `nav_control` (+ results). CLI does **not** paint page overlays; Interactive `nav -enter` drives the peer overlay via `nav_control`. **CLI-host only** (not shared bmxt-core grammar): `dom -list --device/--tab` oneshot → stdout; Interactive `dom -wizard` picks peer/tab/scope/flavor then `dom_list`. Extension `dom` / `nav` display & local logic stay unchanged.
- **Search wire:** Hits larger than a tiny set are always sent as ordered **`search_query_chunk`** frames (≈40 KiB target, peer cap 400). Soft-capped single `search_query_result` only for ≤50 hits. CLI accumulates until `eof` and shows Interactive ASCII progress (`chunk=i/n`). URL picker caps at 200 rows.

## CLI device

| Item | Value |
|------|--------|
| `browser` kind on roster | treat as unknown / display-only; do not reject |
| Default display name | `terminal@<shortDeviceId>` |
| Config dir | `~/.config/bmxt/` |

## BMXt POSIX I/O (todo §13)

Shared meaning for the **extension terminal** and **CLI** (`bmxt` / `bmxt exec`). Described as POSIX-style **byte streams** (UTF-8, newline-separated by default); **delivery is a completion buffer** (arrays / one-shot sink). True incremental chunking is **out of scope** for §13/§14.

| Channel | Meaning |
|---------|---------|
| **stdout** | Command result lines only (listings, `ok`, status rows, success msgs) |
| **stderr** | Diagnostics only (usage, parse, unknown command, runtime errors) |
| **exit** | Numeric status after the buffer is complete |

| Exit | Meaning |
|------|---------|
| `0` | Success |
| `1` | Runtime / host failure |
| `2` | Misuse (usage, parse, bad args) |
| `127` | Unknown command |

### Rules

1. One grammar line → one `{ stdout[], stderr[], exit }` snapshot (compound/pipe reduce to a single overall exit).
2. Failure must not pollute stdout with usage/error text when channels are applied (stderr carries diagnostics).
3. Extension: `SegmentOutcome.stdout` / `.stderr` / `.exitStatus` are primary; `lines` is display projection; session log may encode stderr with the in-band prefix; `SessionPatch.appendLog.channel` must not drop the channel.
4. CLI: aggregate into `CommandIo` then sink — **Interactive** (REPL) flushes to process FDs; **NonInteractive** (`exec`) returns the buffer over IPC / client FDs. Infrastructure logs (`repl_log`, door bind warnings) must not mix into command stderr.
5. Non-interactive (`bmxt exec`): handshake **ask** / zenity / `| browse` / TUI pickers are **forbidden**; missing connection or unset delivery → stderr + non-zero exit (no hang).

Shared types: TS `command-output.ts` / `SegmentOutcome`; Rust `bmxt_core::CommandOutput`.

## Profile discipline when adding commands (todo §15)

Mandatory for new/changed commands and host paths. Not IEEE 1003.1 compliance — **BMXt Profile** only.

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | Exit status uses **core constants only** (`EXIT_SUCCESS` / `FAILURE` / `MISUSE` / `NOT_FOUND` = 0/1/2/127) | unit + conformance |
| 2 | Success listings → **stdout**; usage / parse / unknown / runtime diagnostics → **stderr** | golden tests (exit-routed sinks) |
| 3 | Interactive UI (`\| browse`, TUI, handshake ask / zenity) only when **`InteractionMode::Interactive`** | NonInteractive / `exec` tests |
| 4 | CLI command results go through **`CommandIo`** — no direct `println!` / `eprintln!` on the adapter command path (infra logs allowlisted) | `pnpm run check:cli-command-io` |
| 5 | Pipes use **closed consumers** + **`bmxtRule`** only; unknown consumer → exit **2** | registry + conformance |

Skill: `.cursor/skills/bmxt-add-command` · checklist: `shared/manifest/templates/new-command.checklist.md`.

## `bmxt exec` IPC (todo §14)

| Item | Value |
|------|--------|
| Client | `bmxt exec -- '<line>'` (optional multiple argv after `--`; else one stdin line) |
| Resident | `bmxt` / `bmxt repl` with door listening (Family joined) |
| Transport | **HTTP on door** · `POST http://127.0.0.1:17653/v1/exec` · loopback only |
| Auth | Loopback bind is the trust boundary (same as door hello host). No Family seal on exec body (local process → local process). |
| Request | JSON `{ "line": "<BMXt grammar line>" }` · max 200_000 UTF-8 bytes |
| Response | JSON `{ "stdout": string[], "stderr": string[], "exitStatus": number }` · HTTP 200 even when `exitStatus ≠ 0` |
| Client FDs | Print `stdout` lines to OS stdout, `stderr` to OS stderr; process exit = `exitStatus` |
| Timeout | Client default **120s**; no hang if door down (immediate connection error → exit `1`) |
| Resident missing | Client stderr message + exit `1` |
| Mode | Resident runs `CliHostAdapter` in **NonInteractive** |

Out of scope for §14: UDS alternative, JSON result wrapper flags, stdin multi-line batch, true incremental chunk IPC.

## Fixtures

Committed under `_context/cli-peer/fixtures/` and mirrored for Rust tests under `shared/crates/bmxt-family/tests/fixtures/`.

- `ping.json` / `ack.json` — bus samples
- `sealed-handshake.json` — seed + envelope + expected plain (generated by `scripts/cli-peer/gen-family-fixtures.mjs`)

Regenerate sealed fixture:

```bash
node scripts/cli-peer/gen-family-fixtures.mjs
```
