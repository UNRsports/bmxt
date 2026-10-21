# Host packages (Chrome / Firefox)

| Path | Role |
|------|------|
| [`../shared/`](../shared/) | Shared extension source (entrypoints, `lib/`, Rust/WASM, public assets, command manifest) |
| [`chrome/`](chrome/) | Chrome MV3 WXT config (`pnpm run build:chrome`; `verify` / CWS) |
| [`firefox/`](firefox/) | Firefox MV3 WXT config + [AMO source kit](firefox/AMO_SOURCE.md) |

WXT `root` is **`shared/`** for both hosts (entrypoints must live under the WXT project root). Browser-specific packaging stays under `hosts/*`.

```bash
pnpm run build            # both → chrome-mv3 + firefox-mv3
pnpm run build:chrome     # .output/chrome-mv3
pnpm run build:firefox    # .output/firefox-mv3
pnpm run package          # chrome zip + firefox zip + firefox AMO sources tarball
pnpm run package:chrome   # .output/bmxt-<ver>-chrome.zip
pnpm run package:firefox  # .output/bmxt-<ver>-firefox.zip + …-firefox-sources.tar.gz
```
