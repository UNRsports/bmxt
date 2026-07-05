# BMXt UI settings — reference

## Storage keys

| Key constant | chrome.storage.local key | Content |
|--------------|--------------------------|---------|
| `UI_SETTINGS_KEY` | `bmxt_ui_settings_v1` | Committed UI settings (cache + SW locale) |
| `UI_SETTINGS_STORAGE_CONFIG_KEY` | `bmxt_ui_settings_storage_v1` | `{ mode: "internal" \| "external", directoryName: string \| null }` |

## settings.json versions

| Version | Notes |
|---------|-------|
| v1 | Legacy import supported in `parseSettingsExportJson` |
| v2 | Current; image paths as relative bundle file names (`bgImageFile`, `picker.bgImageFile`) |

When bumping version:

1. Add parser branch in `parseSettingsExportJson`.
2. Keep importing all older versions.
3. New fields optional in JSON.
4. Apply `normalizeUiAppearance` / `normalizeUiSettingsStorageConfig` for missing keys.

## External bundle layout

```
<picked-or-bmxt-ui-settings>/
  settings.json
  background-image.{png,jpg,webp}      # when set
  picker-background-image.{png,jpg,webp}  # when set
```

Constants: `settings-bundle-layout.ts` (`EXTERNAL_SETTINGS_BUNDLE_DIR`, known image file names).

## Load / save flow

**Load:** External bundle if readable → else `bmxt_ui_settings_v1` → normalize partial objects.

**Save (`> save setting`):** Write full bundle to disk (external mode) + update `bmxt_ui_settings_v1`.

**Export (zip) / Import:** Same layout as external directory via `buildUiSettingsStorageEntries` / `parseSettingsExportJson`.

## Backward compatibility rules

1. Never assume every key exists in stored objects.
2. Do not rename `settings.json`, `background-image`, `picker-background-image`, `bmxt-ui-settings/` without compatibility reader + README migration notes.
3. Bundle from older release must import on newer via `import` or storage-reload.
4. Round-trip export after edit must remain valid.

## Module map

| Module | Responsibility |
|--------|----------------|
| `settings.ts` | Load/save orchestration |
| `settings-export.ts` | Zip + JSON parse/build |
| `settings-external-storage.ts` | File System Access API |
| `settings-bundle-layout.ts` | Bundle paths and file names |
| `settings-storage-mode.ts` | Mode read/write |
| `settings-storage-config.ts` | Storage config normalization |
| `settings-handle-db.ts` | IndexedDB directory handle |
| `appearance.ts` | `normalizeUiAppearance` |

## Tests and docs

- **`setting.test.ts`** — extend when changing version or layout constants.
- **README § setting** (EN + JA) — update when behavior or on-disk format changes.
