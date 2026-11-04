# Host packages (Chrome / Firefox × PC / SP)

| Path | Role |
|------|------|
| [`../shared/`](../shared/) | Shared extension source (entrypoints, `lib/`, Rust/WASM, public assets) |
| [`../shared/lib/features/host-env/`](../shared/lib/features/host-env/) | Runtime browser × form-factor × shell dispatch |
| [`chrome/pc/`](chrome/pc/) | Chrome PC packaging (CWS) |
| [`chrome/sp/`](chrome/sp/) | Chrome SP notes (same popup model; no separate store package) |
| [`firefox/pc/`](firefox/pc/) | Firefox PC packaging (AMO) |
| [`firefox/sp/`](firefox/sp/) | **Special case:** Firefox SP tab shell notes |
| [`firefox/AMO_SOURCE.md`](firefox/AMO_SOURCE.md) | AMO source kit |

WXT `root` is **`shared/`** for both hosts. Thin entry configs:

- [`chrome/wxt.config.ts`](chrome/wxt.config.ts) → `chrome/pc/`
- [`firefox/wxt.config.ts`](firefox/wxt.config.ts) → `firefox/pc/`

## Product matrix (shell)

| | PC | SP |
|---|---|---|
| **Chrome** | popup | popup |
| **Firefox** | popup | **tab** (only special case) |

Shipped artifacts remain **two** (`build:chrome` / `build:firefox`). Firefox desktop + Android share one XPI; SP vs PC is runtime (`host-env`), not a second zip.

```bash
pnpm run build            # both → chrome-mv3 + firefox-mv3
pnpm run build:chrome     # .output/chrome-mv3
pnpm run build:firefox    # .output/firefox-mv3
pnpm run package          # chrome zip + firefox zip + firefox AMO sources tarball
```
