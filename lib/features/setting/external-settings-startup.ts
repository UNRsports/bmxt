import { parseAppearanceResetConfirmAnswer } from "./parse-appearance-reset-confirm"
import { tSetting } from "./i18n/ns/setting"
import type { UiLocale } from "./locale"
import {
  activateExternalUiSettingsStorage,
  loadUiSettingsFromDirectory,
  pickUiSettingsDirectory,
  reloadUiSettingsFromExternalDirectory
} from "./settings-external-storage"
import { loadUiSettingsDirectoryHandle } from "./settings-handle-db"
import { loadUiSettingsStorageConfig } from "./settings-storage-config"
import {
  loadUiSettingsInternalCache,
  replaceUiSettings,
  resetUiSettingsToDefaultsAndInternal,
  type UiSettings
} from "./settings"

export type ExternalSettingsStartupAssessment =
  | { needsRecovery: false }
  | { needsRecovery: true; directoryName: string | null }

export async function assessExternalSettingsBundleAtStartup(): Promise<ExternalSettingsStartupAssessment> {
  const config = await loadUiSettingsStorageConfig()
  if (config.mode !== "external") {
    return { needsRecovery: false }
  }
  const handle = await loadUiSettingsDirectoryHandle()
  if (!handle) {
    return { needsRecovery: true, directoryName: config.directoryName }
  }
  try {
    await loadUiSettingsFromDirectory(handle)
    return { needsRecovery: false }
  } catch {
    return { needsRecovery: true, directoryName: config.directoryName }
  }
}

export function externalSettingsRecoveryLogLines(
  locale: UiLocale,
  directoryName: string | null
): string[] {
  const location =
    directoryName ??
    tSetting("setting.storage.recovery.locationUnknown", locale)
  return [
    tSetting("setting.storage.recovery.warning", locale, { location }),
    tSetting("setting.storage.recovery.prompt", locale)
  ]
}

export type ExternalSettingsRecoveryAnswerResult =
  | { ok: true; kind: "repick"; loaded: boolean; directoryName: string }
  | { ok: true; kind: "reset" }
  | { ok: false; kind: "invalid" }
  | { ok: false; kind: "pick_cancelled" }
  | { ok: false; kind: "pick_failed"; message: string }

export async function applyExternalSettingsRecoveryAnswer(
  trimmed: string,
  onSettingsCommitted: (settings: UiSettings) => void
): Promise<ExternalSettingsRecoveryAnswerResult> {
  const answer = parseAppearanceResetConfirmAnswer(trimmed)
  if (answer === "invalid") {
    return { ok: false, kind: "invalid" }
  }
  if (answer === "no") {
    const defaults = await resetUiSettingsToDefaultsAndInternal()
    onSettingsCommitted(defaults)
    return { ok: true, kind: "reset" }
  }
  const picked = await pickUiSettingsDirectory()
  if (!picked.ok) {
    if ("cancelled" in picked && picked.cancelled) {
      return { ok: false, kind: "pick_cancelled" }
    }
    return {
      ok: false,
      kind: "pick_failed",
      message: "message" in picked ? picked.message : "folder selection failed"
    }
  }
  await activateExternalUiSettingsStorage(picked.handle, picked.directoryName)
  const reloaded = await reloadUiSettingsFromExternalDirectory()
  if (reloaded.ok) {
    await replaceUiSettings(reloaded.settings)
    onSettingsCommitted(reloaded.settings)
    return { ok: true, kind: "repick", loaded: true, directoryName: picked.directoryName }
  }
  const cached = await loadUiSettingsInternalCache()
  await replaceUiSettings(cached)
  onSettingsCommitted(cached)
  return { ok: true, kind: "repick", loaded: false, directoryName: picked.directoryName }
}
