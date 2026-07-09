import {
  buildUiSettingsStorageEntries,
  parseSettingsExportJson,
  type SettingsExportJson
} from "./settings-export"
import { sanitizeBundleBgImageFileName } from "./sanitize-bundle-bg-image-file-name.ts"
import {
  EXTERNAL_SETTINGS_BUNDLE_DIR,
  formatExternalSettingsBundleDisplayName,
  listKnownBundleImageFileNames,
  SETTINGS_JSON_NAME
} from "./settings-bundle-layout"
import {
  clearUiSettingsDirectoryHandle,
  loadUiSettingsDirectoryHandle,
  saveUiSettingsDirectoryHandle
} from "./settings-handle-db"
import {
  loadUiSettingsStorageConfig,
  saveUiSettingsStorageConfig,
  type UiSettingsStorageConfig
} from "./settings-storage-config"
import type { UiSettings } from "./settings"

const DIRECTORY_PICKER_ID = "bmxt-ui-settings"

export type ExternalStorageErrorCode =
  | "unavailable"
  | "cancelled"
  | "permission_denied"
  | "read_failed"
  | "write_failed"
  | "invalid_settings"

export type PickUiSettingsDirectoryResult =
  | { ok: true; handle: FileSystemDirectoryHandle; directoryName: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled?: false; error: ExternalStorageErrorCode; message: string }

export function isFileSystemAccessAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showDirectoryPicker === "function"
  )
}

async function verifyDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  readWrite: boolean
): Promise<boolean> {
  const mode: FileSystemPermissionMode = readWrite ? "readwrite" : "read"
  if ((await handle.queryPermission({ mode })) === "granted") {
    return true
  }
  if ((await handle.requestPermission({ mode })) === "granted") {
    return true
  }
  return false
}

async function readFileBytes(
  dir: FileSystemDirectoryHandle,
  name: string
): Promise<Uint8Array | null> {
  try {
    const fileHandle = await dir.getFileHandle(name)
    const file = await fileHandle.getFile()
    return new Uint8Array(await file.arrayBuffer())
  } catch {
    return null
  }
}

function safeBundleImageFileName(raw: string | null | undefined): string | null {
  return sanitizeBundleBgImageFileName(raw)
}

function imageFileNamesFromExportJson(json: SettingsExportJson): string[] {
  const names: string[] = []
  const globalFile = safeBundleImageFileName(json.appearance.bgImageFile)
  if (globalFile) {
    names.push(globalFile)
  }
  const pickerFile = safeBundleImageFileName(json.appearance.picker.bgImageFile)
  if (pickerFile) {
    names.push(pickerFile)
  }
  return names
}

function isSettingsExportVersion(raw: unknown): raw is SettingsExportJson["version"] {
  return raw === 1 || raw === 2
}

export type ExternalBundleMissingKind =
  | "directory_handle"
  | "directory_permission"
  | "settings_json"
  | "settings_json_invalid"
  | "background_image"
  | "picker_background_image"

export type ExternalBundleMissingItem = {
  kind: ExternalBundleMissingKind
  fileName?: string
}

export type ExternalBundleInspection =
  | { status: "not_external" }
  | { status: "ok"; directoryName: string | null }
  | {
      status: "incomplete"
      directoryName: string | null
      missing: ExternalBundleMissingItem[]
    }

async function collectMissingReferencedImages(
  handle: FileSystemDirectoryHandle,
  parsed: SettingsExportJson,
  missing: ExternalBundleMissingItem[]
): Promise<void> {
  const globalFile = safeBundleImageFileName(parsed.appearance.bgImageFile)
  if (globalFile) {
    const bytes = await readFileBytes(handle, globalFile)
    if (!bytes) {
      missing.push({ kind: "background_image", fileName: globalFile })
    }
  }
  const pickerFile = safeBundleImageFileName(parsed.appearance.picker.bgImageFile)
  if (pickerFile) {
    const bytes = await readFileBytes(handle, pickerFile)
    if (!bytes) {
      missing.push({ kind: "picker_background_image", fileName: pickerFile })
    }
  }
}

/** EN: Verify external bundle contents on each BMXt window launch (external mode only). */
export async function inspectExternalSettingsBundle(): Promise<ExternalBundleInspection> {
  const config = await loadUiSettingsStorageConfig()
  if (config.mode !== "external") {
    return { status: "not_external" }
  }

  const handle = await loadUiSettingsDirectoryHandle()
  if (!handle) {
    return {
      status: "incomplete",
      directoryName: config.directoryName,
      missing: [{ kind: "directory_handle" }]
    }
  }

  const directoryName = config.directoryName ?? handle.name

  const allowed = await verifyDirectoryPermission(handle, false)
  if (!allowed) {
    return {
      status: "incomplete",
      directoryName,
      missing: [{ kind: "directory_permission" }]
    }
  }

  const missing: ExternalBundleMissingItem[] = []
  const jsonBytes = await readFileBytes(handle, SETTINGS_JSON_NAME)
  if (!jsonBytes) {
    missing.push({ kind: "settings_json", fileName: SETTINGS_JSON_NAME })
    return { status: "incomplete", directoryName, missing }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(jsonBytes))
  } catch {
    missing.push({ kind: "settings_json_invalid", fileName: SETTINGS_JSON_NAME })
    return { status: "incomplete", directoryName, missing }
  }

  if (!parsed || typeof parsed !== "object") {
    missing.push({ kind: "settings_json_invalid", fileName: SETTINGS_JSON_NAME })
    return { status: "incomplete", directoryName, missing }
  }

  const record = parsed as Record<string, unknown>
  if (!isSettingsExportVersion(record.version)) {
    missing.push({ kind: "settings_json_invalid", fileName: SETTINGS_JSON_NAME })
    return { status: "incomplete", directoryName, missing }
  }

  if (!record.appearance || typeof record.appearance !== "object") {
    missing.push({ kind: "settings_json_invalid", fileName: SETTINGS_JSON_NAME })
    return { status: "incomplete", directoryName, missing }
  }

  await collectMissingReferencedImages(
    handle,
    record as SettingsExportJson,
    missing
  )
  if (missing.length > 0) {
    return { status: "incomplete", directoryName, missing }
  }

  try {
    await loadUiSettingsFromDirectory(handle)
  } catch {
    missing.push({ kind: "settings_json_invalid", fileName: SETTINGS_JSON_NAME })
    return { status: "incomplete", directoryName, missing }
  }

  return { status: "ok", directoryName }
}

async function removeBundleFileIfPresent(
  dir: FileSystemDirectoryHandle,
  name: string
): Promise<void> {
  try {
    await dir.removeEntry(name)
  } catch {
    // absent or not removable
  }
}

async function pruneStaleBundleImages(
  dir: FileSystemDirectoryHandle,
  currentFileNames: ReadonlySet<string>
): Promise<void> {
  for (const name of listKnownBundleImageFileNames()) {
    if (!currentFileNames.has(name)) {
      await removeBundleFileIfPresent(dir, name)
    }
  }
}

/** EN: Resolve bundle root: use picked dir when it already has settings.json, else create subdir. */
export async function resolveExternalSettingsBundleDir(
  picked: FileSystemDirectoryHandle
): Promise<{ bundle: FileSystemDirectoryHandle; displayName: string }> {
  const settingsAtRoot = await readFileBytes(picked, SETTINGS_JSON_NAME)
  if (settingsAtRoot) {
    return { bundle: picked, displayName: picked.name }
  }
  const bundle = await picked.getDirectoryHandle(EXTERNAL_SETTINGS_BUNDLE_DIR, { create: true })
  return {
    bundle,
    displayName: formatExternalSettingsBundleDisplayName(picked.name)
  }
}

async function readDirectorySettingsFiles(
  dir: FileSystemDirectoryHandle
): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>()
  const jsonBytes = await readFileBytes(dir, SETTINGS_JSON_NAME)
  if (!jsonBytes) {
    throw new Error("settings.json missing")
  }
  files.set(SETTINGS_JSON_NAME, jsonBytes)
  let parsed: SettingsExportJson
  try {
    parsed = JSON.parse(new TextDecoder().decode(jsonBytes)) as SettingsExportJson
  } catch {
    throw new Error("invalid settings.json")
  }
  for (const name of imageFileNamesFromExportJson(parsed)) {
    const bytes = await readFileBytes(dir, name)
    if (bytes) {
      files.set(name, bytes)
    }
  }
  return files
}

export async function loadUiSettingsFromDirectory(
  dir: FileSystemDirectoryHandle
): Promise<UiSettings> {
  const allowed = await verifyDirectoryPermission(dir, false)
  if (!allowed) {
    throw new Error("permission denied")
  }
  const files = await readDirectorySettingsFiles(dir)
  const jsonBytes = files.get(SETTINGS_JSON_NAME)
  if (!jsonBytes) {
    throw new Error("settings.json missing")
  }
  const jsonText = new TextDecoder().decode(jsonBytes)
  return parseSettingsExportJson(jsonText, files)
}

export async function saveUiSettingsToDirectory(
  dir: FileSystemDirectoryHandle,
  settings: UiSettings
): Promise<void> {
  const allowed = await verifyDirectoryPermission(dir, true)
  if (!allowed) {
    throw new Error("permission denied")
  }
  const entries = buildUiSettingsStorageEntries(settings)
  const currentFileNames = new Set(entries.map((entry) => entry.name))
  for (const entry of entries) {
    const fileHandle = await dir.getFileHandle(entry.name, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(entry.data)
    await writable.close()
  }
  await pruneStaleBundleImages(dir, currentFileNames)
}

export async function pickUiSettingsDirectory(): Promise<PickUiSettingsDirectoryResult> {
  if (!isFileSystemAccessAvailable()) {
    return {
      ok: false,
      error: "unavailable",
      message: "file system access unavailable"
    }
  }
  try {
    const picked = await window.showDirectoryPicker({
      id: DIRECTORY_PICKER_ID,
      mode: "readwrite"
    })
    const resolved = await resolveExternalSettingsBundleDir(picked)
    const allowed = await verifyDirectoryPermission(resolved.bundle, true)
    if (!allowed) {
      return {
        ok: false,
        error: "permission_denied",
        message: "directory permission denied"
      }
    }
    return { ok: true, handle: resolved.bundle, directoryName: resolved.displayName }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { ok: false, cancelled: true }
    }
    return {
      ok: false,
      error: "read_failed",
      message: e instanceof Error ? e.message : String(e)
    }
  }
}

export async function activateExternalUiSettingsStorage(
  handle: FileSystemDirectoryHandle,
  directoryName: string
): Promise<UiSettingsStorageConfig> {
  await saveUiSettingsDirectoryHandle(handle)
  const config: UiSettingsStorageConfig = {
    mode: "external",
    directoryName
  }
  await saveUiSettingsStorageConfig(config)
  return config
}

export async function activateInternalUiSettingsStorage(): Promise<UiSettingsStorageConfig> {
  const config: UiSettingsStorageConfig = {
    mode: "internal",
    directoryName: null
  }
  await saveUiSettingsStorageConfig(config)
  return config
}

export async function tryLoadUiSettingsFromExternal(): Promise<UiSettings | null> {
  const config = await loadUiSettingsStorageConfig()
  if (config.mode !== "external") {
    return null
  }
  const handle = await loadUiSettingsDirectoryHandle()
  if (!handle) {
    return null
  }
  try {
    return await loadUiSettingsFromDirectory(handle)
  } catch {
    return null
  }
}

export async function trySaveUiSettingsToExternal(settings: UiSettings): Promise<void> {
  const config = await loadUiSettingsStorageConfig()
  if (config.mode !== "external") {
    return
  }
  const handle = await loadUiSettingsDirectoryHandle()
  if (!handle) {
    throw new Error("external directory handle missing")
  }
  await saveUiSettingsToDirectory(handle, settings)
}

export async function reloadUiSettingsFromExternalDirectory(): Promise<
  | { ok: true; settings: UiSettings }
  | { ok: false; error: ExternalStorageErrorCode; message: string }
> {
  const handle = await loadUiSettingsDirectoryHandle()
  if (!handle) {
    return {
      ok: false,
      error: "read_failed",
      message: "external directory handle missing"
    }
  }
  try {
    const settings = await loadUiSettingsFromDirectory(handle)
    return { ok: true, settings }
  } catch (e) {
    return {
      ok: false,
      error: "read_failed",
      message: e instanceof Error ? e.message : String(e)
    }
  }
}

export async function repickUiSettingsDirectory(): Promise<PickUiSettingsDirectoryResult> {
  const picked = await pickUiSettingsDirectory()
  if (!picked.ok) {
    return picked
  }
  await activateExternalUiSettingsStorage(picked.handle, picked.directoryName)
  return picked
}

export async function clearExternalUiSettingsStorage(): Promise<void> {
  await clearUiSettingsDirectoryHandle()
}
