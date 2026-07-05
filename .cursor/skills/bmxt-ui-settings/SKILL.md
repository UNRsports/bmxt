---
name: bmxt-ui-settings
description: >-
  Implements or changes BMXt UI settings persistence (internal chrome.storage,
  external File System Access API, zip export/import, settings.json bundle,
  backward compatibility). Use when editing lib/features/setting/, settings
  export/import, storage keys, or setting -list behavior.
---

# BMXt — UI settings persistence

Read [reference.md](reference.md) for storage keys, bundle layout, and module map.

## Scope

UI locale and terminal/picker appearance edited in **`setting -list`**.

- Implementation: **`lib/features/setting/`**
- Storage keys: **`lib/features/extension-storage/keys.ts`**
- User-facing behavior: README § **`setting`**

## Checklist (every settings change)

```
Task progress:
- [ ] New JSON fields optional; normalize on read (normalizeUiAppearance, normalizeUiSettingsStorageConfig)
- [ ] version bump only with parseSettingsExportJson branch; keep importing older versions (v1, v2)
- [ ] Do not rename bundle file/dir names without migration + README
- [ ] bmxt_ui_settings_v1 treated as partial object; normalize on read
- [ ] Old zip/external bundles import on newer release; export round-trip valid
- [ ] Tests in setting.test.ts (and import parsers) updated
- [ ] README setting section (EN + JA) updated if on-disk behavior changed
```

## Storage model

**Internal (default):** Settings mirrored in `chrome.storage.local` under **`bmxt_ui_settings_v1`** (`UI_SETTINGS_KEY`). Mode preference: **`bmxt_ui_settings_storage_v1`** (`UI_SETTINGS_STORAGE_CONFIG_KEY`): `{ mode: "internal" | "external", directoryName: string | null }`. Default **`internal`**.

**External (optional):** When `mode: "external"`, BMXt UI page uses **File System Access API** (user-picked folder; **no new manifest permission**). Bundle root = picked dir if it contains **`settings.json`**, else **`<picked>/bmxt-ui-settings/`** (`EXTERNAL_SETTINGS_BUNDLE_DIR` in `settings-bundle-layout.ts`). Handle in IndexedDB (`settings-handle-db.ts`). On **`> save setting`**: write bundle to disk **and** update **`bmxt_ui_settings_v1`**. On load: prefer external bundle; fall back to internal.

## Bundle format (single canonical layout)

Zip **export** and external **save** must produce identical bytes/layout via **`buildUiSettingsStorageEntries`** / **`parseSettingsExportJson`**. Prune stale images on external save with **`listKnownBundleImageFileNames`**. **Do not fork** layout without a migration path.

| File | Role |
|------|------|
| `settings.json` | Portable JSON; **`version`** (currently **2**); image refs as relative names |
| `background-image.{png,jpg,webp}` | Global background |
| `picker-background-image.{png,jpg,webp}` | Picker-layer background |

## Key modules

`settings.ts`, `settings-export.ts`, `settings-external-storage.ts`, `settings-bundle-layout.ts`, `settings-storage-mode.ts`, `settings-storage-config.ts`, `appearance.ts` (`normalizeUiAppearance`).
