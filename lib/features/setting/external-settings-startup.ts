import { migrateSnapshotsToExternalBundleWithLog } from "../snapshot/snapshot-external-migration"
import { tSetting } from "./i18n/ns/setting"
import type { UiLocale } from "./locale"
import {
  externalSettingsRecoveryLogLines,
  formatExternalBundleMissingLine
} from "./external-settings-recovery-log"
import { parseAppearanceResetConfirmAnswer } from "./parse-appearance-reset-confirm"
import {
  activateExternalUiSettingsStorage,
  inspectExternalSettingsBundle,
  pickUiSettingsDirectory,
  reloadUiSettingsFromExternalDirectory,
  type ExternalBundleMissingItem
} from "./settings-external-storage"
import {
  loadUiSettingsInternalCache,
  mirrorUiSettingsToInternalCache,
  replaceUiSettings,
  resetUiSettingsToDefaultsAndInternal,
  type UiSettings
} from "./settings"
import { bootstrapUiSettingsOnWindowLaunch } from "./ui-settings-bootstrap"

export type { ExternalBundleMissingItem } from "./settings-external-storage"
export { externalSettingsRecoveryLogLines, formatExternalBundleMissingLine } from "./external-settings-recovery-log"

export type ExternalSettingsStartupAssessment =
  | { needsRecovery: false }
  | { needsRecovery: true; directoryName: string | null; missing: ExternalBundleMissingItem[] }

export async function assessExternalSettingsBundleAtStartup(): Promise<ExternalSettingsStartupAssessment> {
  const result = await bootstrapUiSettingsOnWindowLaunch()
  if (result.kind !== "needs_recovery") {
    return { needsRecovery: false }
  }
  return {
    needsRecovery: true,
    directoryName: result.directoryName,
    missing: result.missing
  }
}

export type ExternalSettingsRecoveryAnswerResult =
  | { ok: true; kind: "repick"; loaded: boolean; directoryName: string; migrateLines: string[] }
  | { ok: true; kind: "reset" }
  | { ok: false; kind: "invalid" }
  | { ok: false; kind: "pick_cancelled" }
  | { ok: false; kind: "pick_failed"; message: string }
  | { ok: false; kind: "bundle_incomplete"; directoryName: string; missing: ExternalBundleMissingItem[] }

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
  const cachedLocale = (await loadUiSettingsInternalCache()).locale
  const migrateLines = await migrateSnapshotsToExternalBundleWithLog(
    picked.handle,
    cachedLocale
  )
  const inspection = await inspectExternalSettingsBundle()
  if (inspection.status === "incomplete") {
    return {
      ok: false,
      kind: "bundle_incomplete",
      directoryName: picked.directoryName,
      missing: inspection.missing
    }
  }
  const reloaded = await reloadUiSettingsFromExternalDirectory()
  if (reloaded.ok) {
    await mirrorUiSettingsToInternalCache(reloaded.settings)
    onSettingsCommitted(reloaded.settings)
    return { ok: true, kind: "repick", loaded: true, directoryName: picked.directoryName, migrateLines }
  }
  const cached = await loadUiSettingsInternalCache()
  onSettingsCommitted(cached)
  return { ok: true, kind: "repick", loaded: false, directoryName: picked.directoryName, migrateLines }
}

export function externalSettingsRecoveryFollowUpLogLines(
  locale: UiLocale,
  directoryName: string,
  missing: readonly ExternalBundleMissingItem[]
): string[] {
  const lines = [
    tSetting("setting.storage.recovery.repickStillIncomplete", locale, { location: directoryName }),
    tSetting("setting.storage.recovery.missingHead", locale)
  ]
  for (const item of missing) {
    lines.push(`  - ${formatExternalBundleMissingLine(locale, item)}`)
  }
  lines.push(tSetting("setting.storage.recovery.prompt", locale))
  return lines
}
