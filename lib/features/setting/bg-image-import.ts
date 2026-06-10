import {
  BG_IMAGE_ALLOWED_MIME_TYPES,
  BG_IMAGE_MAX_BYTES
} from "./appearance"
import type { MessageKey } from "./i18n/messages"

export type BgImageImportResult =
  | { ok: true; dataUrl: string; mimeType: string; byteLength: number }
  | { ok: false; errorKey: MessageKey; cancelled?: boolean }

function isAllowedMimeType(mime: string): mime is (typeof BG_IMAGE_ALLOWED_MIME_TYPES)[number] {
  for (const allowed of BG_IMAGE_ALLOWED_MIME_TYPES) {
    if (allowed === mime) {
      return true
    }
  }
  return false
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("failed to read image"))
      }
    }
    reader.onerror = () => reject(new Error("failed to read image"))
    reader.readAsDataURL(file)
  })
}

/** EN: Open a file picker and import a background image into storage (size/MIME validated). */
export async function importBackgroundImageFromFilePicker(): Promise<BgImageImportResult> {
  if (typeof document === "undefined") {
    return { ok: false, errorKey: "setting.error.filePickerUnavailable" }
  }

  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = BG_IMAGE_ALLOWED_MIME_TYPES.join(",")
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
          resolve({ ok: false, errorKey: "setting.bgImport.cancelled", cancelled: true })
          return
        }
        if (!isAllowedMimeType(file.type)) {
          resolve({
            ok: false,
            errorKey: "setting.error.bgMime"
          })
          return
        }
        if (file.size > BG_IMAGE_MAX_BYTES) {
          resolve({
            ok: false,
            errorKey: "setting.error.bgSize"
          })
          return
        }
        try {
          const dataUrl = await readFileAsDataUrl(file)
          const encodedLength = new TextEncoder().encode(dataUrl).length
          if (encodedLength > BG_IMAGE_MAX_BYTES * 2) {
            resolve({
              ok: false,
              errorKey: "setting.error.bgEncodedSize"
            })
            return
          }
          resolve({
            ok: true,
            dataUrl,
            mimeType: file.type,
            byteLength: file.size
          })
        } catch {
          resolve({ ok: false, errorKey: "setting.error.bgReadFailed" })
        }
      })()
    })

    document.body.appendChild(input)
    input.click()
  })
}
