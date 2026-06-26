import { useCallback } from "react"
import { importBackgroundImageFromFilePicker } from "../../setting/bg-image-import"
import { bgImportErrorLine } from "../../setting/i18n/resolvers"
import type { SettingEditField } from "../../setting/setting-picker-edit"
import {
  fontSizeFromPickerIndex,
  type SettingPickerRow
} from "../../setting/setting-picker-rows"
import {
  settingPickerApplyDraftToMain,
  settingPickerGoToView,
  type SettingListPickerState
} from "../../setting/setting-list-picker-state"
import { replaceUiSettings } from "../../setting/settings"
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

export type UseSettingPickerShellOptions = {
  sessionId: string
  uiLocale: UiSettings["locale"]
  appendLogLines: (lines: string[]) => Promise<void>
  replaceUiSettingsState: (settings: UiSettings) => void
  closeSettingPickerColumn: () => void
  setSettingListPicker: (
    sessionId: string,
    value:
      | SettingListPickerState
      | null
      | ((prev: SettingListPickerState | null) => SettingListPickerState | null)
  ) => void
  settingListPickerRef: React.MutableRefObject<SettingListPickerState | null>
}

/** EN: Setting list picker row actions, edit apply, and state updates. */
export function useSettingPickerShell(options: UseSettingPickerShellOptions) {
  const onSettingPickerStateChange = useCallback(
    (next: SettingListPickerState) => {
      options.setSettingListPicker(options.sessionId, next)
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
      if (row.id === "save") {
        const draft = current.draft
        const { externalWriteFailed } = await replaceUiSettings(draft)
        options.replaceUiSettingsState(draft)
        options.closeSettingPickerColumn()
        const lines = [logPrefix, tSetting("setting.picker.saved", options.uiLocale)]
        if (externalWriteFailed) {
          lines.push(
            tSetting("setting.storage.externalWriteFailed", options.uiLocale)
          )
        }
        await options.appendLogLines(lines)
        return
      }
      if (row.id === "cancel") {
        options.closeSettingPickerColumn()
        await options.appendLogLines([logPrefix, tSetting("setting.picker.cancelled", options.uiLocale)])
        return
      }
      if (row.id === "locale-ja" || row.id === "locale-en") {
        const locale = row.id === "locale-ja" ? "ja" : "en"
        options.setSettingListPicker(
          options.sessionId,
          settingPickerApplyDraftToMain(current, { locale })
        )
        return
      }
      if (row.id === "edit-picker-on") {
        options.setSettingListPicker(
          options.sessionId,
          settingPickerApplyDraftToMain(current, { editPicker: true })
        )
        return
      }
      if (row.id === "edit-picker-off") {
        options.setSettingListPicker(
          options.sessionId,
          settingPickerApplyDraftToMain(current, { editPicker: false })
        )
        return
      }
      if (row.id === "reset-yes") {
        options.setSettingListPicker(
          options.sessionId,
          settingPickerApplyDraftToMain(current, {
            editPicker: false,
            appearance: {
              fg: null,
              bgColor: null,
              fontSize: null,
              fontFamily: null,
              bgImageDataUrl: null
            },
            picker: {
              fg: null,
              bgColor: null,
              fontSize: null,
              fontFamily: null,
              bgImageDataUrl: null
            }
          })
        )
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
        options.setSettingListPicker(
          options.sessionId,
          settingPickerApplyDraftToMain(current, patch)
        )
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
        options.setSettingListPicker(
          options.sessionId,
          settingPickerApplyDraftToMain(afterImport, bgPatch)
        )
        return
      }
      if (row.id === "bg-clear") {
        const bgPatch =
          current.view === "pickerBgImage"
            ? { picker: { bgImageDataUrl: null } }
            : { appearance: { bgImageDataUrl: null } }
        options.setSettingListPicker(
          options.sessionId,
          settingPickerApplyDraftToMain(current, bgPatch)
        )
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
            tSetting("setting.storage.unavailable", options.uiLocale)
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
          options.setSettingListPicker(options.sessionId, {
            ...settingPickerGoToView("main", current),
            draft: reloaded.settings
          })
          await options.appendLogLines([
            logPrefix,
            tSetting("setting.storage.externalActivatedLoaded", options.uiLocale, {
              directory: picked.directoryName
            }),
            ...migrateLines
          ])
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
            tSetting("setting.storage.unavailable", options.uiLocale)
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
            tSetting("setting.storage.unavailable", options.uiLocale)
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
            tSetting("setting.storage.unavailable", options.uiLocale)
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
          options.setSettingListPicker(options.sessionId, {
            ...afterReload,
            view: "main",
            editing: false,
            editDraft: "",
            draft: reloaded.settings
          })
          await options.appendLogLines([
            logPrefix,
            tSetting("setting.storage.reloadDraft", options.uiLocale)
          ])
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
        options.setSettingListPicker(options.sessionId, {
          ...afterImport,
          view: "main",
          editing: false,
          editDraft: "",
          draft: result.settings
        })
        await options.appendLogLines([logPrefix, tSetting("setting.picker.importDraft", options.uiLocale)])
      }
    },
    [options]
  )

  const onSettingPickerApplyEdit = useCallback(
    async (field: SettingEditField, value: string) => {
      options.setSettingListPicker(options.sessionId, (current) => {
        if (!current) {
          return null
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
        const draftPatch =
          field === "picker-fg" || field === "picker-bg-color" || field === "picker-font"
            ? { picker: layerPatch }
            : { appearance: layerPatch }
        return settingPickerApplyDraftToMain(current, draftPatch)
      })
    },
    [options]
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
