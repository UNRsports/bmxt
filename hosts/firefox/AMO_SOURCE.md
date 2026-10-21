# BMXt — Firefox source submission (AMO)

Mozilla add-on reviewers need **reviewable source** and **reproducible build instructions** when the shipped package is bundled (WXT/Vite) and includes WASM. This file is the canonical guide for the Firefox host.

## Layout

| Path | Role |
|------|------|
| `shared/` | Browser-agnostic code (TypeScript features, Rust/`bmxt-core` WASM, entrypoints, public assets, command manifest) |
| `hosts/firefox/` | Firefox WXT config, gecko id, this document, AMO source zip helper |
| `hosts/chrome/` | Chrome-only packaging (not required to build the Firefox add-on) |

## Toolchain (pin these)

| Tool | Pin / location |
|------|----------------|
| Node.js | `.nvmrc` at repo root |
| pnpm | `package.json` → `packageManager` (enable via Corepack) |
| Lockfile | `pnpm-lock.yaml` — use `pnpm install --frozen-lockfile` |
| Rust | stable toolchain + target `wasm32-unknown-unknown` |
| wasm-pack | `bash scripts/install-wasm-pack.sh` (pins **0.15.0**) |

## Build the Firefox add-on

From the **repository root**:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run build:firefox
```

Production packages (extension + AMO source):

```bash
pnpm run package:firefox
# or both hosts: pnpm run package
```

### Outputs

| Artifact | Path |
|----------|------|
| Unpacked extension | `.output/firefox-mv3/` |
| Extension zip (AMO upload) | `.output/bmxt-<version>-firefox.zip` |
| Source tarball (AMO review) | `.output/bmxt-<version>-firefox-sources.tar.gz` |

Load unpacked in Firefox: `about:debugging` → This Firefox → Load Temporary Add-on → select `.output/firefox-mv3/manifest.json`.

## Extension id

`browser_specific_settings.gecko.id` is fixed as **`bmxt@unrsports`** (see `hosts/manifest-base.ts`). Confirm before AMO listing if a different id is required.

## Data collection (manifest)

`browser_specific_settings.gecko.data_collection_permissions.required` is **`["none"]`**: BMXt keeps prompt history / UI settings in `chrome.storage.local` and does not transmit data outside the extension.

## Automated validation notes (warnings)

| Finding | Status |
|---------|--------|
| Icon size mismatch | Fixed — sized `icon-16/32/48/128.png` match manifest keys |
| `windows.onBoundsChanged` | Fixed — removed; popup page `resize`/`pagehide` persists bounds |
| Unsafe `innerHTML` in UI chunk | **Expected** — comes from **react-dom** (not extension-authored DOM injection). BMXt UI does not use `dangerouslySetInnerHTML` or assign `innerHTML` in app code. AMO treats this as a warning for trusted frameworks; submission notes may cite this section. |

## Minimum Firefox version

| Key | Value | Reason |
|-----|-------|--------|
| `gecko.strict_min_version` | **140.0** | Required with `data_collection_permissions` (desktop consent UI); also covers tabGroups |
| `gecko_android.strict_min_version` | **142.0** | Android built-in data-collection consent floor |

## Chrome-only features (not Firefox parity yet)

The same `shared/` tree may contain Chrome-oriented APIs (Translator, File System Access, favicon permission). Firefox builds omit Chrome-only **manifest** permissions (`favicon`, `commands.*.global`). Runtime stubs / feature flags are tracked separately; core shell commands are the Firefox smoke target.

## Source archive for reviewers

`pnpm run package:firefox` writes **`.output/bmxt-<version>-firefox-sources.tar.gz`** (full repo inputs needed to reproduce the build; excludes `node_modules`, `.output`, built wasm/js copies under `shared/public/`, etc.). Attach that archive on AMO together with **`bmxt-<version>-firefox.zip`**, and point reviewers at **this file**.

Do not use any `bmxt-*-sources.zip` left from older WXT defaults — that archive was incomplete for this monorepo layout.
