export type UiSettingsStorageMode = "internal" | "external"

export type UiSettingsStorageConfig = {
  mode: UiSettingsStorageMode
  /** EN: `FileSystemDirectoryHandle.name` when external mode is active. */
  directoryName: string | null
}

export const DEFAULT_UI_SETTINGS_STORAGE_CONFIG: UiSettingsStorageConfig = {
  mode: "internal",
  directoryName: null
}

function parseStorageMode(raw: unknown): UiSettingsStorageMode {
  return raw === "external" ? "external" : "internal"
}

export function normalizeUiSettingsStorageConfig(
  raw: Partial<UiSettingsStorageConfig> | null | undefined
): UiSettingsStorageConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_UI_SETTINGS_STORAGE_CONFIG }
  }
  return {
    mode: parseStorageMode(raw.mode),
    directoryName: typeof raw.directoryName === "string" ? raw.directoryName : null
  }
}
