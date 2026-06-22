import { useCallback } from "react"
import { resetSearchCacheFromSettings } from "../../search/cache/search-cache-store"
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
        await replaceUiSettings(draft)
        options.replaceUiSettingsState(draft)
        options.closeSettingPickerColumn()
        await options.appendLogLines([logPrefix, tSetting("setting.picker.saved", options.uiLocale)])
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
      if (row.id === "search-cache-reset-yes") {
        try {
          await resetSearchCacheFromSettings()
          options.setSettingListPicker(options.sessionId, settingPickerGoToView("main", current))
          await options.appendLogLines([logPrefix, tSetting("setting.searchCache.resetDone", options.uiLocale)])
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
      if (row.id === "search-cache-reset-no") {
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
