import {
  BG_IMAGE_ALLOWED_MIME_TYPES,
  BG_IMAGE_MAX_BYTES,
  DEFAULT_UI_APPEARANCE_LAYER,
  normalizeUiAppearance,
  type UiAppearance,
  type UiAppearanceLayer
} from "./appearance"
import type { UiLocale } from "./locale"
import { loadUiSettings, type UiSettings } from "./settings"
import { parseHexColor } from "./validate-color"
import { parseFontFamily } from "./validate-font"
import { parseFontSizePx } from "./validate-size"
import { buildZipArchive, parseZipArchive } from "./zip-store"

export const SETTINGS_JSON_NAME = "settings.json"
export const BG_IMAGE_ZIP_NAME = "background-image"
export const PICKER_BG_IMAGE_ZIP_NAME = "picker-background-image"

type SettingsExportAppearanceV2 = {
  fg: string | null
  bgColor: string | null
  fontSize: string | null
  fontFamily: string | null
  bgImageFile: string | null
  editPicker: boolean
  picker: {
    fg: string | null
    bgColor: string | null
    fontSize: string | null
    fontFamily: string | null
    bgImageFile: string | null
  }
}

export type SettingsExportJson = {
  version: 2
  exportedAt: string
  locale: UiLocale
  appearance: SettingsExportAppearanceV2
}

function mimeToExtension(mime: string): string {
  if (mime === "image/png") {
    return "png"
  }
  if (mime === "image/jpeg") {
    return "jpg"
  }
  if (mime === "image/webp") {
    return "webp"
  }
  return "bin"
}

function isAllowedMimeType(mime: string): mime is (typeof BG_IMAGE_ALLOWED_MIME_TYPES)[number] {
  for (const allowed of BG_IMAGE_ALLOWED_MIME_TYPES) {
    if (allowed === mime) {
      return true
    }
  }
  return false
}

/** EN: Decode a data URL into raw bytes and MIME type. */
export function dataUrlToBytes(
  dataUrl: string
): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:([^;,]+)?(?:;base64)?,(.*)$/s.exec(dataUrl)
  if (!m) {
    return null
  }
  const mime = (m[1] ?? "application/octet-stream").toLowerCase()
  const payload = m[2] ?? ""
  const isBase64 = dataUrl.includes(";base64,")
  try {
    if (isBase64) {
      const binary = atob(payload)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return { mime, bytes }
    }
    const decoded = decodeURIComponent(payload)
    const bytes = new TextEncoder().encode(decoded)
    return { mime, bytes }
  } catch {
    return null
  }
}

function bgImageFileName(
  dataUrl: string | null,
  baseName: string
): string | null {
  if (!dataUrl) {
    return null
  }
  const decoded = dataUrlToBytes(dataUrl)
  if (decoded && isAllowedMimeType(decoded.mime)) {
    return `${baseName}.${mimeToExtension(decoded.mime)}`
  }
  return null
}

export function buildSettingsExportJson(settings: UiSettings): SettingsExportJson {
  const { locale, appearance } = settings
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    locale,
    appearance: {
      fg: appearance.fg,
      bgColor: appearance.bgColor,
      fontSize: appearance.fontSize,
      fontFamily: appearance.fontFamily,
      bgImageFile: bgImageFileName(appearance.bgImageDataUrl, BG_IMAGE_ZIP_NAME),
      editPicker: appearance.editPicker,
      picker: {
        fg: appearance.picker.fg,
        bgColor: appearance.picker.bgColor,
        fontSize: appearance.picker.fontSize,
        fontFamily: appearance.picker.fontFamily,
        bgImageFile: bgImageFileName(appearance.picker.bgImageDataUrl, PICKER_BG_IMAGE_ZIP_NAME)
      }
    }
  }
}

function exportZipFilename(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `bmxt-ui-settings-${stamp}.zip`
}

function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined") {
    throw new Error("download unavailable")
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function bytesToDataUrl(mime: string, bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  const b64 = btoa(binary)
  return `data:${mime};base64,${b64}`
}

function loadBgImageFromZip(
  bgImageFile: string | null | undefined,
  files: Map<string, Uint8Array>
): string | null {
  if (!bgImageFile) {
    return null
  }
  const imgBytes = files.get(bgImageFile)
  if (!imgBytes) {
    return null
  }
  const ext = bgImageFile.split(".").pop()?.toLowerCase() ?? ""
  const mime =
    ext === "png"
      ? "image/png"
      : ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "webp"
          ? "image/webp"
          : ""
  if (!isAllowedMimeType(mime)) {
    return null
  }
  const dataUrl = bytesToDataUrl(mime, imgBytes)
  const encodedLength = new TextEncoder().encode(dataUrl).length
  if (encodedLength > BG_IMAGE_MAX_BYTES * 2) {
    throw new Error("background image exceeds storage limit")
  }
  return dataUrl
}

function parseLayerFromExport(
  raw: Record<string, unknown>,
  files: Map<string, Uint8Array>,
  bgImageFileKey: string
): UiAppearanceLayer {
  const bgImageFile =
    typeof raw.bgImageFile === "string"
      ? raw.bgImageFile
      : typeof raw[bgImageFileKey] === "string"
        ? (raw[bgImageFileKey] as string)
        : null
  const bgImageDataUrl = loadBgImageFromZip(bgImageFile, files)
  const fg = typeof raw.fg === "string" ? parseHexColor(raw.fg) : null
  const bgColor = typeof raw.bgColor === "string" ? parseHexColor(raw.bgColor) : null
  const fontSize = typeof raw.fontSize === "string" ? parseFontSizePx(raw.fontSize) : null
  const fontFamily = typeof raw.fontFamily === "string" ? parseFontFamily(raw.fontFamily) : null
  return { fg, bgColor, fontSize, fontFamily, bgImageDataUrl }
}

function parseAppearanceFromExportV1(
  raw: Record<string, unknown>,
  files: Map<string, Uint8Array>
): UiAppearance {
  const layer = parseLayerFromExport(raw, files, "bgImageFile")
  return normalizeUiAppearance(layer)
}

function parseAppearanceFromExportV2(
  raw: SettingsExportAppearanceV2,
  files: Map<string, Uint8Array>
): UiAppearance {
  const global = parseLayerFromExport(raw, files, "bgImageFile")
  const pickerRaw = raw.picker
  const picker = pickerRaw
    ? parseLayerFromExport(pickerRaw as unknown as Record<string, unknown>, files, "bgImageFile")
    : { ...DEFAULT_UI_APPEARANCE_LAYER }
  return normalizeUiAppearance({
    ...global,
    editPicker: raw.editPicker === true,
    picker
  })
}

function isUiLocale(raw: unknown): raw is UiLocale {
  return raw === "ja" || raw === "en"
}

/** EN: Parse and validate exported settings JSON from a zip import. */
export function parseSettingsExportJson(
  rawText: string,
  files: Map<string, Uint8Array>
): UiSettings {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error("invalid settings.json")
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid settings.json")
  }
  const o = parsed as Record<string, unknown>
  if (o.version !== 1 && o.version !== 2) {
    throw new Error("unsupported settings version")
  }
  if (!isUiLocale(o.locale)) {
    throw new Error("invalid locale in settings.json")
  }
  if (!o.appearance || typeof o.appearance !== "object") {
    throw new Error("invalid appearance in settings.json")
  }
  const appearance =
    o.version === 2
      ? parseAppearanceFromExportV2(o.appearance as SettingsExportAppearanceV2, files)
      : parseAppearanceFromExportV1(o.appearance as Record<string, unknown>, files)
  return { locale: o.locale, appearance }
}

/** EN: Package UI settings JSON + background image into a zip and save locally. */
export async function exportUiSettingsZip(
  settings?: UiSettings
): Promise<{ filename: string }> {
  const resolved = settings ?? (await loadUiSettings())
  const json = buildSettingsExportJson(resolved)
  const entries: { name: string; data: Uint8Array }[] = [
    {
      name: SETTINGS_JSON_NAME,
      data: new TextEncoder().encode(JSON.stringify(json, null, 2))
    }
  ]
  const pushImage = (fileName: string | null, dataUrl: string | null) => {
    if (!fileName || !dataUrl) {
      return
    }
    const decoded = dataUrlToBytes(dataUrl)
    if (decoded) {
      entries.push({ name: fileName, data: decoded.bytes })
    }
  }
  pushImage(json.appearance.bgImageFile, resolved.appearance.bgImageDataUrl)
  pushImage(json.appearance.picker.bgImageFile, resolved.appearance.picker.bgImageDataUrl)
  const zipBytes = buildZipArchive(entries)
  const filename = exportZipFilename()
  downloadBlob(new Blob([zipBytes], { type: "application/zip" }), filename)
  return { filename }
}

/** EN: Read a zip file from disk and return validated UI settings. */
export async function readUiSettingsFromZipFile(file: File): Promise<UiSettings> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const entries = parseZipArchive(buf)
  const files = new Map<string, Uint8Array>()
  for (const entry of entries) {
    files.set(entry.name.replace(/\\/g, "/"), entry.data)
  }
  const jsonBytes = files.get(SETTINGS_JSON_NAME)
  if (!jsonBytes) {
    throw new Error("settings.json missing from zip")
  }
  const jsonText = new TextDecoder().decode(jsonBytes)
  return parseSettingsExportJson(jsonText, files)
}

export async function importUiSettingsZipFromFilePicker(): Promise<
  | { ok: true; settings: UiSettings }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled?: false; error: string }
> {
  if (typeof document === "undefined") {
    return { ok: false, error: "file picker unavailable" }
  }
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".zip,application/zip"
    input.style.position = "fixed"
    input.style.left = "-9999px"
    input.style.opacity = "0"
    input.style.pointerEvents = "none"

    const cleanup = () => {
      input.remove()
    }

    input.addEventListener("change", () => {
      void (async () => {
        const file = input.files?.[0]
        cleanup()
        if (!file) {
          resolve({ ok: false, cancelled: true })
          return
        }
        try {
          const settings = await readUiSettingsFromZipFile(file)
          resolve({ ok: true, settings })
        } catch (e) {
          resolve({
            ok: false,
            error: e instanceof Error ? e.message : String(e)
          })
        }
      })()
    })

    document.body.appendChild(input)
    input.click()
  })
}
