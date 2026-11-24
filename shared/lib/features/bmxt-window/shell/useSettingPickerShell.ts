import { useCallback } from "react"
import { importBackgroundImageFromFilePicker } from "../../setting/bg-image-import"
import { bgImportErrorLine } from "../../setting/i18n/resolvers"
import type { SettingEditField } from "../../setting/setting-picker-edit"
import {
  fontSizeFromPickerIndex,
  type SettingPickerRow
} from "../../setting/setting-picker-rows"
import {
  applySettingDraftPatchToSettings,
  settingPickerGoToView,
  type SettingDraftPatch,
  type SettingListPickerState
} from "../../setting/setting-list-picker-state"
import { commitUiSettings } from "../../setting/setting-cui-apply"
import { migrateSnapshotsToExternalBundleWithLog } from "../../snapshot/snapshot-external-migration"
import { migrateSnapshotsToVaultWithLog } from "../../snapshot/snapshot-vault-migration"
import { loadSnapshotStorageConfig } from "../../snapshot/snapshot-storage-config"
import {
  activateBundledSnapshotStorage,
  activateSnapshotVaultStorage,
  pickSnapshotVaultDirectory,
  repickSnapshotVaultDirectory
} from "../../snapshot/snapshot-vault-persistence"
import { formatSnapshotVaultDisplayName } from "../../snapshot/snapshot-vault-layout"
import { storageFsaUnavailableLine } from "../../setting/fsa-unavailable-message"
import {
  activateExternalUiSettingsStorage,
  activateInternalUiSettingsStorage,
  isFileSystemAccessAvailable,
  pickUiSettingsDirectory,
  reloadUiSettingsFromExternalDirectory,
  repickUiSettingsDirectory
} from "../../setting/settings-external-storage"
import {
  exportUiSettingsZip,
  importUiSettingsZipFromFilePicker
} from "../../setting/settings-export"
import type { UiSettings } from "../../setting/settings"
import { tSetting } from "../../setting/i18n/ns/setting"
import { tError } from "../../setting/i18n/ns/error"
import { expandSyncLogLines } from "../../sync/facade/expand-sync-log.ts"
import { getSyncService } from "../../sync/facade/sync-service.ts"

export type UseSettingPickerShellOptions = {
  sessionId: string
  uiLocale: UiSettings["locale"]
  appendLogLines: (lines: string[]) => void | Promise<void>
  setSettingListPicker: (
    sessionId: string,
    value:
      | SettingListPickerState
      | null
      | ((prev: SettingListPickerState | null) => SettingListPickerState | null)
  ) => void
  settingListPickerRef: React.MutableRefObject<SettingListPickerState | null>
  replaceUiSettingsState: (settings: UiSettings) => void
}

/** EN: Setting list picker row actions, edit apply, and state updates. */
export function useSettingPickerShell(options: UseSettingPickerShellOptions) {
  const onSettingPickerStateChange = useCallback(
    (next: SettingListPickerState) => {
      options.setSettingListPicker(options.sessionId, next)
    },
    [options]
  )

  const commitPatchAndMirror = useCallback(
    async (
      current: SettingListPickerState,
      patch: SettingDraftPatch,
      returnToMain: boolean
    ): Promise<{ externalWriteFailed: boolean }> => {
      const nextSettings = applySettingDraftPatchToSettings(current.draft, patch)
      const { settings, externalWriteFailed } = await commitUiSettings(
        nextSettings,
        options.replaceUiSettingsState
      )
      const mirrored = returnToMain
        ? settingPickerGoToView("main", { ...current, draft: settings })
        : { ...current, draft: settings, editing: false, editDraft: "" }
      options.setSettingListPicker(options.sessionId, mirrored)
      return { externalWriteFailed }
    },
    [options]
  )

  const commitFullSettings = useCallback(
    async (
      current: SettingListPickerState,
      nextSettings: UiSettings
    ): Promise<{ externalWriteFailed: boolean }> => {
      const { settings, externalWriteFailed } = await commitUiSettings(
        nextSettings,
        options.replaceUiSettingsState
      )
      options.setSettingListPicker(
        options.sessionId,
        settingPickerGoToView("main", { ...current, draft: settings })
      )
      return { externalWriteFailed }
    },
    [options]
  )

  const appendExternalFailedIfNeeded = useCallback(
    async (logPrefix: string, externalWriteFailed: boolean) => {
      if (!externalWriteFailed) {
        return
      }
      await options.appendLogLines([
        logPrefix,
        tSetting("setting.storage.externalWriteFailed", options.uiLocale)
      ])
    },
    [options]
  )

  const onSettingPickerRowAction = useCallback(
    async (row: SettingPickerRow, index: number) => {
      const logPrefix = "setting -list"
      const current = options.settingListPickerRef.current
      if (!current) {
        return
      }
      if (row.id === "locale-ja" || row.id === "locale-en") {
        const locale = row.id === "locale-ja" ? "ja" : "en"
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          { locale },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "edit-picker-on") {
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          { editPicker: true },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "edit-picker-off") {
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          { editPicker: false },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "ime-candidate-help-on") {
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          { imeCandidateHelp: true },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "ime-candidate-help-off") {
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          { imeCandidateHelp: false },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "prompt-fire-on") {
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          { promptFire: true },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "prompt-fire-off") {
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          { promptFire: false },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "search-legend-text") {
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          { searchLegendMode: "text" },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "search-legend-emoji") {
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          { searchLegendMode: "emoji" },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "search-legend-text-emoji") {
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          { searchLegendMode: "text_emoji" },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "host-ui-auto") {
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          { hostUiMode: "auto" },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "host-ui-desktop") {
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          { hostUiMode: "desktop" },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "host-ui-mobile") {
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          { hostUiMode: "mobile" },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "reset-yes") {
        const { externalWriteFailed } = await commitPatchAndMirror(
          current,
          {
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
          },
          true
        )
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "reset-no") {
        return
      }
      if (row.id === "size") {
        const fontSize = fontSizeFromPickerIndex(index)
        if (fontSize === null) {
          return
        }
        const patch =
          current.view === "pickerFontSize"
            ? { picker: { fontSize } }
            : { appearance: { fontSize } }
        const { externalWriteFailed } = await commitPatchAndMirror(current, patch, true)
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "bg-import") {
        const result = await importBackgroundImageFromFilePicker()
        if (result.ok === false) {
          if (result.cancelled) {
            await options.appendLogLines([logPrefix, tSetting("setting.bgImport.cancelled", options.uiLocale)])
          } else {
            await options.appendLogLines([
              logPrefix,
              bgImportErrorLine(options.uiLocale, result)
            ])
          }
          return
        }
        const afterImport = options.settingListPickerRef.current ?? current
        const bgPatch =
          afterImport.view === "pickerBgImage"
            ? { picker: { bgImageDataUrl: result.dataUrl } }
            : { appearance: { bgImageDataUrl: result.dataUrl } }
        const { externalWriteFailed } = await commitPatchAndMirror(afterImport, bgPatch, true)
        await options.appendLogLines([
          logPrefix,
          tSetting("setting.bgImage.imported", options.uiLocale, {
            mimeType: result.mimeType,
            byteLength: String(result.byteLength)
          })
        ])
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "bg-clear") {
        const bgPatch =
          current.view === "pickerBgImage"
            ? { picker: { bgImageDataUrl: null } }
            : { appearance: { bgImageDataUrl: null } }
        const { externalWriteFailed } = await commitPatchAndMirror(current, bgPatch, true)
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        return
      }
      if (row.id === "storage-mode-internal") {
        await activateInternalUiSettingsStorage()
        options.setSettingListPicker(
          options.sessionId,
          settingPickerGoToView("main", current)
        )
        await options.appendLogLines([
          logPrefix,
          tSetting("setting.storage.internalActivated", options.uiLocale)
        ])
        return
      }
      if (row.id === "storage-mode-external") {
        if (!isFileSystemAccessAvailable()) {
          await options.appendLogLines([
            logPrefix,
            storageFsaUnavailableLine(options.uiLocale)
          ])
          return
        }
        const picked = await pickUiSettingsDirectory()
        if (!picked.ok) {
          if ("cancelled" in picked && picked.cancelled) {
            await options.appendLogLines([
              logPrefix,
              tSetting("setting.storage.pickCancelled", options.uiLocale)
            ])
          } else {
            await options.appendLogLines([
              logPrefix,
              tSetting("setting.storage.pickFailed", options.uiLocale, {
                message: "message" in picked ? picked.message : tError("error.unknown", options.uiLocale)
              })
            ])
          }
          return
        }
        await activateExternalUiSettingsStorage(picked.handle, picked.directoryName)
        const snapshotConfig = await loadSnapshotStorageConfig()
        const migrateLines =
          snapshotConfig.destination === "bundled"
            ? await migrateSnapshotsToExternalBundleWithLog(picked.handle, options.uiLocale)
            : []
        const reloaded = await reloadUiSettingsFromExternalDirectory()
        if (reloaded.ok) {
          const { externalWriteFailed } = await commitFullSettings(
            current,
            reloaded.settings
          )
          await options.appendLogLines([
            logPrefix,
            tSetting("setting.storage.externalActivatedLoaded", options.uiLocale, {
              directory: picked.directoryName
            }),
            ...migrateLines
          ])
          await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
        } else {
          options.setSettingListPicker(
            options.sessionId,
            settingPickerGoToView("main", current)
          )
          await options.appendLogLines([
            logPrefix,
            tSetting("setting.storage.externalActivated", options.uiLocale, {
              directory: picked.directoryName
            }),
            ...migrateLines
          ])
        }
        return
      }
      if (row.id === "storage-pick-dir") {
        if (!isFileSystemAccessAvailable()) {
          await options.appendLogLines([
            logPrefix,
            storageFsaUnavailableLine(options.uiLocale)
          ])
          return
        }
        const picked = await repickUiSettingsDirectory()
        if (!picked.ok) {
          if ("cancelled" in picked && picked.cancelled) {
            await options.appendLogLines([
              logPrefix,
              tSetting("setting.storage.pickCancelled", options.uiLocale)
            ])
          } else {
            await options.appendLogLines([
              logPrefix,
              tSetting("setting.storage.pickFailed", options.uiLocale, {
                message: "message" in picked ? picked.message : tError("error.unknown", options.uiLocale)
              })
            ])
          }
          return
        }
        await options.appendLogLines([
          logPrefix,
          tSetting("setting.storage.directoryUpdated", options.uiLocale, {
            directory: picked.directoryName
          })
        ])
        return
      }
      if (row.id === "snapshot-storage-bundled") {
        await activateBundledSnapshotStorage()
        options.setSettingListPicker(
          options.sessionId,
          settingPickerGoToView("main", current)
        )
        await options.appendLogLines([
          logPrefix,
          tSetting("setting.snapshotStorage.bundledActivated", options.uiLocale)
        ])
        return
      }
      if (row.id === "snapshot-storage-vault") {
        if (!isFileSystemAccessAvailable()) {
          await options.appendLogLines([
            logPrefix,
            storageFsaUnavailableLine(options.uiLocale)
          ])
          return
        }
        const picked = await pickSnapshotVaultDirectory()
        if (!picked.ok) {
          if ("cancelled" in picked && picked.cancelled) {
            await options.appendLogLines([
              logPrefix,
              tSetting("setting.storage.pickCancelled", options.uiLocale)
            ])
          } else {
            await options.appendLogLines([
              logPrefix,
              tSetting("setting.storage.pickFailed", options.uiLocale, {
                message: "message" in picked ? picked.message : tError("error.unknown", options.uiLocale)
              })
            ])
          }
          return
        }
        await activateSnapshotVaultStorage(picked.handle, picked.directoryName)
        const migrateLines = await migrateSnapshotsToVaultWithLog(
          picked.handle,
          options.uiLocale
        )
        options.setSettingListPicker(
          options.sessionId,
          settingPickerGoToView("main", current)
        )
        await options.appendLogLines([
          logPrefix,
          tSetting("setting.snapshotStorage.vaultActivated", options.uiLocale, {
            directory: formatSnapshotVaultDisplayName(picked.directoryName)
          }),
          ...migrateLines
        ])
        return
      }
      if (row.id === "snapshot-vault-pick-dir") {
        if (!isFileSystemAccessAvailable()) {
          await options.appendLogLines([
            logPrefix,
            storageFsaUnavailableLine(options.uiLocale)
          ])
          return
        }
        const picked = await repickSnapshotVaultDirectory()
        if (!picked.ok) {
          if ("cancelled" in picked && picked.cancelled) {
            await options.appendLogLines([
              logPrefix,
              tSetting("setting.storage.pickCancelled", options.uiLocale)
            ])
          } else {
            await options.appendLogLines([
              logPrefix,
              tSetting("setting.storage.pickFailed", options.uiLocale, {
                message: "message" in picked ? picked.message : tError("error.unknown", options.uiLocale)
              })
            ])
          }
          return
        }
        await options.appendLogLines([
          logPrefix,
          tSetting("setting.snapshotStorage.vaultDirectoryUpdated", options.uiLocale, {
            directory: formatSnapshotVaultDisplayName(picked.directoryName)
          })
        ])
        return
      }
      if (row.id === "storage-reload") {
        const reloaded = await reloadUiSettingsFromExternalDirectory()
        if (reloaded.ok) {
          const afterReload = options.settingListPickerRef.current ?? current
          const { externalWriteFailed } = await commitFullSettings(
            afterReload,
            reloaded.settings
          )
          await options.appendLogLines([
            logPrefix,
            tSetting("setting.storage.reloadCommitted", options.uiLocale)
          ])
          await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
          return
        }
        if (reloaded.ok === false) {
          await options.appendLogLines([
            logPrefix,
            tSetting("setting.storage.reloadFailed", options.uiLocale, {
              message: reloaded.message
            })
          ])
          return
        }
      }
      if (row.id === "sync-device-name") {
        options.setSettingListPicker(
          options.sessionId,
          settingPickerGoToView("syncDeviceName", current)
        )
        return
      }
      if (row.id === "sync-setup-guide") {
        await options.appendLogLines([
          logPrefix,
          tSetting("setting.picker.syncSetupGuide.line1", options.uiLocale),
          tSetting("setting.picker.syncSetupGuide.line2", options.uiLocale),
          tSetting("setting.picker.syncSetupGuide.line3", options.uiLocale),
          tSetting("setting.picker.syncSetupGuide.line4", options.uiLocale)
        ])
        return
      }
      if (row.id === "export") {
        try {
          const { filename } = await exportUiSettingsZip(current.draft)
          await options.appendLogLines([
            logPrefix,
            tSetting("setting.export.done", options.uiLocale, { filename })
          ])
        } catch (e) {
          await options.appendLogLines([
            logPrefix,
            tError("error.generic", options.uiLocale, {
              message: e instanceof Error ? e.message : String(e)
            })
          ])
        }
        return
      }
      if (row.id === "import") {
        const result = await importUiSettingsZipFromFilePicker()
        if (result.ok === false) {
          if ("cancelled" in result && result.cancelled) {
            await options.appendLogLines([logPrefix, tSetting("setting.import.cancelled", options.uiLocale)])
            return
          }
          await options.appendLogLines([
            logPrefix,
            tSetting("setting.import.failed", options.uiLocale, {
              message: "error" in result ? result.error : tError("error.unknown", options.uiLocale)
            })
          ])
          return
        }
        const afterImport = options.settingListPickerRef.current ?? current
        const { externalWriteFailed } = await commitFullSettings(
          afterImport,
          result.settings
        )
        await options.appendLogLines([
          logPrefix,
          tSetting("setting.import.done", options.uiLocale)
        ])
        await appendExternalFailedIfNeeded(logPrefix, externalWriteFailed)
      }
    },
    [appendExternalFailedIfNeeded, commitFullSettings, commitPatchAndMirror, options]
  )

  const onSettingPickerApplyEdit = useCallback(
    async (field: SettingEditField, value: string) => {
      if (field === "sync-display-name") {
        const result = await getSyncService().setDisplayName(value)
        await options.appendLogLines([
          "setting -list",
          ...expandSyncLogLines(result.lines, options.uiLocale)
        ])
        return
      }
      const current = options.settingListPickerRef.current
      if (!current) {
        return
      }
      const layerPatch =
        field === "fg" || field === "picker-fg"
          ? { fg: value }
          : field === "bg-color" || field === "picker-bg-color"
            ? { bgColor: value }
            : field === "search-hit-highlight"
              ? { searchHitHighlightBg: value }
              : field === "search-jump-highlight"
                ? { searchJumpHighlightBg: value }
                : { fontFamily: value }
      const draftPatch: SettingDraftPatch =
        field === "picker-fg" || field === "picker-bg-color" || field === "picker-font"
          ? { picker: layerPatch }
          : { appearance: layerPatch }
      const { externalWriteFailed } = await commitPatchAndMirror(current, draftPatch, true)
      await appendExternalFailedIfNeeded("setting -list", externalWriteFailed)
    },
    [appendExternalFailedIfNeeded, commitPatchAndMirror, options]
  )

  const onSettingPickerEditInvalid = useCallback(async () => {
    await options.appendLogLines([
      "setting -list",
      tSetting("setting.prompt.editInvalid", options.uiLocale)
    ])
  }, [options])

  return {
    onSettingPickerStateChange,
    onSettingPickerRowAction,
    onSettingPickerApplyEdit,
    onSettingPickerEditInvalid
  }
}
