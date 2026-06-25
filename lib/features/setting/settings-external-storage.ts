import {
  buildUiSettingsStorageEntries,
  parseSettingsExportJson,
  SETTINGS_JSON_NAME,
  type SettingsExportJson
} from "./settings-export"
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

function imageFileNamesFromExportJson(json: SettingsExportJson): string[] {
  const names: string[] = []
  if (json.appearance.bgImageFile) {
    names.push(json.appearance.bgImageFile)
  }
  if (json.appearance.picker.bgImageFile) {
    names.push(json.appearance.picker.bgImageFile)
  }
  return names
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
  for (const entry of entries) {
    const fileHandle = await dir.getFileHandle(entry.name, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(entry.data)
    await writable.close()
  }
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
    const handle = await window.showDirectoryPicker({
      id: DIRECTORY_PICKER_ID,
      mode: "readwrite"
    })
    const allowed = await verifyDirectoryPermission(handle, true)
    if (!allowed) {
      return {
        ok: false,
        error: "permission_denied",
        message: "directory permission denied"
      }
    }
    return { ok: true, handle, directoryName: handle.name }
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
