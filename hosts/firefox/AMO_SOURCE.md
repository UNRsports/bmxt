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

### Temporary Reload and https host permissions

Firefox MV3 treats `host_permissions` as Origin Controls (optional). A clean temporary load grants https hosts on **ADDON_INSTALL**; clicking **Reload** after a rebuild often drops that grant, so `scripting + https host` looks **NG** until hosts are restored.

BMXt’s Firefox host adapter sets:

- `granted_host_permissions: true` — auto-grant on temporary install (AMO permanent installs force this off at parse time)
- `optional_host_permissions` — same https / localhost origins so `permissions.request` can run after Reload

After Reload, open BMXt with the toolbar button or **Alt+Shift+C** (user gesture), or run **`aboutbmxt -system`**, so the extension can re-request https host access.

## Extension id

`browser_specific_settings.gecko.id` is fixed as **`bmxt@unrsports`** (see `hosts/manifest-base.ts`). Confirm before AMO listing if a different id is required.

## Listing: Experimental badge, name, description, privacy policy

These fields live in **Add-ons Developer Hub**, not in the XPI. Updating `docs/index.html` / GitHub Pages alone does **not** refresh the text AMO shows on `/privacy/` — AMO keeps its **own stored copy** (`has_privacy_policy: true` on the public API; the listing still showed float / experimental wording after the canonical policy moved on).

### Clear the Experimental badge

1. Open [Add-ons Developer Hub](https://addons.mozilla.org/developers/) → BMXt → **Edit Listing** / **Edit Information**.
2. **Basic Information** → uncheck **This add-on is experimental**.
3. Save.

### Name and store description

1. **Name** — drop “Demo” (target: `BMXt: Browser Manipulator X Terminal` / locales in `shared/public/_locales/`).
2. **Description** — replace with `store/description_en.txt` / `store/description_ja.txt` (under-development disclaimer; no “Packaged as a demo”, no float prompt).
3. Save. Slug `bmxt-demo-browser-terminal` may stay until you change the AMO URL slug separately.

### Refresh the AMO privacy-policy copy

Canonical HTML: **`docs/index.html`** → https://unrsports.github.io/bmxt/  
AMO paste (English body): **`store/amo-privacy-en.txt`** (current-spec text; no float / experimental wording).

1. Confirm GitHub Pages matches the under-development disclaimer and Family sync / CLI sections.
2. Developer Hub → **Edit Listing** → **Privacy Policy**.
3. Paste from **`store/amo-privacy-en.txt`** (EN field; JA separately if Hub requires) and **Save** so `/firefox/addon/…/privacy/` stops serving the old snapshot.

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
