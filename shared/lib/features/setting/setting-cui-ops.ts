/**
 * EN: One-shot setting operations (export / import / FSA / bg / reset) for UiAction host.
 * JA: UiAction ホスト向け setting ワンショット操作（export / import / FSA / bg / reset）。
 */

import { importBackgroundImageFromFilePicker } from "./bg-image-import.ts"
import { bgImportErrorLine } from "./i18n/resolvers.ts"
import { tError } from "./i18n/ns/error.ts"
import { tSetting } from "./i18n/ns/setting.ts"
import { storageFsaUnavailableLine } from "./fsa-unavailable-message.ts"
import type { UiLocale } from "./locale.ts"
import {
  activateExternalUiSettingsStorage,
  activateInternalUiSettingsStorage,
  isFileSystemAccessAvailable,
  pickUiSettingsDirectory,
  reloadUiSettingsFromExternalDirectory,
  repickUiSettingsDirectory
} from "./settings-external-storage.ts"
import { exportUiSettingsZip, importUiSettingsZipFromFilePicker } from "./settings-export.ts"
import {
  applySettingDraftPatchToSettings,
  settingPickerGoToView,
  type SettingDraftPatch,
  type SettingListPickerState
} from "./setting-list-picker-state.ts"
import { commitUiSettings } from "./setting-cui-apply.ts"
import type { UiSettings } from "./settings.ts"
import { loadSnapshotStorageConfig } from "../snapshot/snapshot-storage-config.ts"
import { migrateSnapshotsToExternalBundleWithLog } from "../snapshot/snapshot-external-migration.ts"
import { migrateSnapshotsToVaultWithLog } from "../snapshot/snapshot-vault-migration.ts"
import {
  activateBundledSnapshotStorage,
  activateSnapshotVaultStorage,
  pickSnapshotVaultDirectory,
  repickSnapshotVaultDirectory
} from "../snapshot/snapshot-vault-persistence.ts"
import { formatSnapshotVaultDisplayName } from "../snapshot/snapshot-vault-layout.ts"

export type SettingCuiOpResult = {
  lines: string[]
  nextDraft?: SettingListPickerState
  settings?: UiSettings
}

function mirrorAfterCommit(
  current: SettingListPickerState | null,
  settings: UiSettings
): SettingListPickerState | undefined {
  if (current === null) {
    return undefined
  }
  return settingPickerGoToView("main", { ...current, draft: settings })
}

const APPEARANCE_RESET_PATCH: SettingDraftPatch = {
  editPicker: false,
  imeCandidateHelp: true,
  promptFire: false,
  searchLegendMode: "text",
  appearance: {
    fg: null,
    bgColor: null,
    fontSize: null,
    fontFamily: null,
    bgImageDataUrl: null,
    searchHitHighlightBg: null,
    searchJumpHighlightBg: null
  },
  picker: {
    fg: null,
    bgColor: null,
    fontSize: null,
    fontFamily: null,
    bgImageDataUrl: null
  }
}

export async function runSettingExportCui(
  settings: UiSettings,
  locale: UiLocale
): Promise<SettingCuiOpResult> {
  try {
    const { filename } = await exportUiSettingsZip(settings)
    return {
      lines: [tSetting("setting.export.done", locale, { filename })]
    }
  } catch (e) {
    return {
      lines: [
        tError("error.generic", locale, {
          message: e instanceof Error ? e.message : String(e)
        })
      ]
    }
  }
}

export async function runSettingImportCui(
  current: SettingListPickerState | null,
  replaceUiSettingsState: (settings: UiSettings) => void,
  locale: UiLocale
): Promise<SettingCuiOpResult> {
  const result = await importUiSettingsZipFromFilePicker()
  if (result.ok === false) {
    if ("cancelled" in result && result.cancelled) {
      return { lines: [tSetting("setting.import.cancelled", locale)] }
    }
    return {
      lines: [
        tSetting("setting.import.failed", locale, {
          message: "error" in result ? result.error : tError("error.unknown", locale)
        })
      ]
    }
  }
  const { settings, externalWriteFailed } = await commitUiSettings(
    result.settings,
    replaceUiSettingsState
  )
  const lines = [tSetting("setting.import.done", locale)]
  if (externalWriteFailed) {
    lines.push(tSetting("setting.storage.externalWriteFailed", locale))
  }
  return {
    lines,
    settings,
    nextDraft: mirrorAfterCommit(current, settings)
  }
}

export async function runSettingBgImportCui(
  current: SettingListPickerState | null,
  committed: UiSettings,
  layer: string,
  replaceUiSettingsState: (settings: UiSettings) => void,
  locale: UiLocale
): Promise<SettingCuiOpResult> {
  const result = await importBackgroundImageFromFilePicker()
  if (result.ok === false) {
    if (result.cancelled) {
      return { lines: [tSetting("setting.bgImport.cancelled", locale)] }
    }
    return { lines: [bgImportErrorLine(locale, result)] }
  }
  const usePicker = layer.trim().toLowerCase() === "picker"
  const patch: SettingDraftPatch = usePicker
    ? { picker: { bgImageDataUrl: result.dataUrl } }
    : { appearance: { bgImageDataUrl: result.dataUrl } }
  const base = current !== null ? current.draft : committed
  const nextSettings = applySettingDraftPatchToSettings(base, patch)
  const { settings, externalWriteFailed } = await commitUiSettings(
    nextSettings,
    replaceUiSettingsState
  )
  const lines = [
    tSetting("setting.bgImage.imported", locale, {
      mimeType: result.mimeType,
      byteLength: String(result.byteLength)
    })
  ]
  if (externalWriteFailed) {
    lines.push(tSetting("setting.storage.externalWriteFailed", locale))
  }
  return {
    lines,
    settings,
    nextDraft: mirrorAfterCommit(current, settings)
  }
}

export async function runSettingResetDefaultCui(
  current: SettingListPickerState | null,
  committed: UiSettings,
  replaceUiSettingsState: (settings: UiSettings) => void,
  locale: UiLocale
): Promise<SettingCuiOpResult> {
  const base = current !== null ? current.draft : committed
  const nextSettings = applySettingDraftPatchToSettings(base, APPEARANCE_RESET_PATCH)
  const { settings, externalWriteFailed } = await commitUiSettings(
    nextSettings,
    replaceUiSettingsState
  )
  const lines = [tSetting("setting.appearance.reset", locale)]
  if (externalWriteFailed) {
    lines.push(tSetting("setting.storage.externalWriteFailed", locale))
  }
  return {
    lines,
    settings,
    nextDraft: mirrorAfterCommit(current, settings)
  }
}

export async function runSettingStorageCui(
  current: SettingListPickerState | null,
  mode: string,
  replaceUiSettingsState: (settings: UiSettings) => void,
  locale: UiLocale
): Promise<SettingCuiOpResult> {
  const normalized = mode.trim().toLowerCase()
  if (normalized === "internal") {
    await activateInternalUiSettingsStorage()
    return {
      lines: [tSetting("setting.storage.internalActivated", locale)],
      nextDraft: current !== null ? settingPickerGoToView("main", current) : undefined
    }
  }
  if (normalized !== "external") {
    return { lines: [tSetting("setting.storage.pickFailed", locale, { message: mode })] }
  }
  if (!isFileSystemAccessAvailable()) {
    return { lines: [storageFsaUnavailableLine(locale)] }
  }
  const picked = await pickUiSettingsDirectory()
  if (!picked.ok) {
    if ("cancelled" in picked && picked.cancelled) {
      return { lines: [tSetting("setting.storage.pickCancelled", locale)] }
    }
    return {
      lines: [
        tSetting("setting.storage.pickFailed", locale, {
          message: "message" in picked ? picked.message : tError("error.unknown", locale)
        })
      ]
    }
  }
  await activateExternalUiSettingsStorage(picked.handle, picked.directoryName)
  const snapshotConfig = await loadSnapshotStorageConfig()
  const migrateLines =
    snapshotConfig.destination === "bundled"
      ? await migrateSnapshotsToExternalBundleWithLog(picked.handle, locale)
      : []
  const reloaded = await reloadUiSettingsFromExternalDirectory()
  if (reloaded.ok) {
    const { settings, externalWriteFailed } = await commitUiSettings(
      reloaded.settings,
      replaceUiSettingsState
    )
    const lines = [
      tSetting("setting.storage.externalActivatedLoaded", locale, {
        directory: picked.directoryName
      }),
      ...migrateLines
    ]
    if (externalWriteFailed) {
      lines.push(tSetting("setting.storage.externalWriteFailed", locale))
    }
    return {
      lines,
      settings,
      nextDraft: mirrorAfterCommit(current, settings)
    }
  }
  return {
    lines: [
      tSetting("setting.storage.externalActivated", locale, {
        directory: picked.directoryName
      }),
      ...migrateLines
    ],
    nextDraft: current !== null ? settingPickerGoToView("main", current) : undefined
  }
}

export async function runSettingPickDirCui(locale: UiLocale): Promise<SettingCuiOpResult> {
  if (!isFileSystemAccessAvailable()) {
    return { lines: [storageFsaUnavailableLine(locale)] }
  }
  const picked = await repickUiSettingsDirectory()
  if (!picked.ok) {
    if ("cancelled" in picked && picked.cancelled) {
      return { lines: [tSetting("setting.storage.pickCancelled", locale)] }
    }
    return {
      lines: [
        tSetting("setting.storage.pickFailed", locale, {
          message: "message" in picked ? picked.message : tError("error.unknown", locale)
        })
      ]
    }
  }
  return {
    lines: [
      tSetting("setting.storage.directoryUpdated", locale, {
        directory: picked.directoryName
      })
    ]
  }
}

export async function runSettingReloadCui(
  current: SettingListPickerState | null,
  replaceUiSettingsState: (settings: UiSettings) => void,
  locale: UiLocale
): Promise<SettingCuiOpResult> {
  const reloaded = await reloadUiSettingsFromExternalDirectory()
  if (reloaded.ok === false) {
    return {
      lines: [
        tSetting("setting.storage.reloadFailed", locale, {
          message: reloaded.message
        })
      ]
    }
  }
  const { settings, externalWriteFailed } = await commitUiSettings(
    reloaded.settings,
    replaceUiSettingsState
  )
  const lines = [tSetting("setting.storage.reloadCommitted", locale)]
  if (externalWriteFailed) {
    lines.push(tSetting("setting.storage.externalWriteFailed", locale))
  }
  return {
    lines,
    settings,
    nextDraft: mirrorAfterCommit(current, settings)
  }
}

export async function runSettingSnapshotStorageCui(
  current: SettingListPickerState | null,
  mode: string,
  locale: UiLocale
): Promise<SettingCuiOpResult> {
  const normalized = mode.trim().toLowerCase()
  if (normalized === "bundled") {
    await activateBundledSnapshotStorage()
    return {
      lines: [tSetting("setting.snapshotStorage.bundledActivated", locale)],
      nextDraft: current !== null ? settingPickerGoToView("main", current) : undefined
    }
  }
  if (normalized !== "vault") {
    return {
      lines: [
        tSetting("setting.storage.pickFailed", locale, { message: mode })
      ]
    }
  }
  if (!isFileSystemAccessAvailable()) {
    return { lines: [storageFsaUnavailableLine(locale)] }
  }
  const picked = await pickSnapshotVaultDirectory()
  if (!picked.ok) {
    if ("cancelled" in picked && picked.cancelled) {
      return { lines: [tSetting("setting.storage.pickCancelled", locale)] }
    }
    return {
      lines: [
        tSetting("setting.storage.pickFailed", locale, {
          message: "message" in picked ? picked.message : tError("error.unknown", locale)
        })
      ]
    }
  }
  await activateSnapshotVaultStorage(picked.handle, picked.directoryName)
  const migrateLines = await migrateSnapshotsToVaultWithLog(picked.handle, locale)
  return {
    lines: [
      tSetting("setting.snapshotStorage.vaultActivated", locale, {
        directory: formatSnapshotVaultDisplayName(picked.directoryName)
      }),
      ...migrateLines
    ],
    nextDraft: current !== null ? settingPickerGoToView("main", current) : undefined
  }
}

export async function runSettingSnapshotPickDirCui(
  locale: UiLocale
): Promise<SettingCuiOpResult> {
  if (!isFileSystemAccessAvailable()) {
    return { lines: [storageFsaUnavailableLine(locale)] }
  }
  const picked = await repickSnapshotVaultDirectory()
  if (!picked.ok) {
    if ("cancelled" in picked && picked.cancelled) {
      return { lines: [tSetting("setting.storage.pickCancelled", locale)] }
    }
    return {
      lines: [
        tSetting("setting.storage.pickFailed", locale, {
          message: "message" in picked ? picked.message : tError("error.unknown", locale)
        })
      ]
    }
  }
  return {
    lines: [
      tSetting("setting.snapshotStorage.vaultDirectoryUpdated", locale, {
        directory: formatSnapshotVaultDisplayName(picked.directoryName)
      })
    ]
  }
}
