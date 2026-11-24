import { useCallback } from "react"
import type { SettingEditField } from "../../setting/setting-picker-edit"
import {
  settingPickerGoToView,
  type SettingListPickerState
} from "../../setting/setting-list-picker-state"
import { settingMainRowTargetView } from "../../setting/setting-picker-nav"
import type { SettingPickerRow } from "../../setting/setting-picker-rows"
import { tSetting } from "../../setting/i18n/ns/setting"
import type { UiLocale } from "../../setting/locale"
import {
  buildSettingEditCommandLine,
  buildSettingPickerRowCommandLine
} from "../../picker/build-setting-command-line.ts"

export type UseSettingPickerShellOptions = {
  sessionId: string
  uiLocale: UiLocale
  appendLogLines: (lines: string[]) => Promise<void>
  setSettingListPicker: (sessionId: string, next: SettingListPickerState) => void
  settingListPickerRef: { current: SettingListPickerState | null }
  /** EN: Re-enter command dispatch with a constructed one-shot line. */
  submitConstructedLine: (line: string) => void
}

/** EN: Setting list picker — navigation locally; side effects via submitConstructedLine. */
export function useSettingPickerShell(options: UseSettingPickerShellOptions) {
  const onSettingPickerStateChange = useCallback(
    (next: SettingListPickerState) => {
      options.setSettingListPicker(options.sessionId, next)
    },
    [options]
  )

  const onSettingPickerRowAction = useCallback(
    async (row: SettingPickerRow, index: number) => {
      const current = options.settingListPickerRef.current
      if (!current) {
        return
      }

      const commandLine = buildSettingPickerRowCommandLine(row.id, current.view, index)
      if (commandLine !== null) {
        options.submitConstructedLine(commandLine)
        return
      }

      if (row.id === "reset-no") {
        options.setSettingListPicker(
          options.sessionId,
          settingPickerGoToView("main", current)
        )
        return
      }

      const target = settingMainRowTargetView(row.id)
      if (target !== null) {
        options.setSettingListPicker(
          options.sessionId,
          settingPickerGoToView(target, current)
        )
      }
    },
    [options]
  )

  const onSettingPickerApplyEdit = useCallback(
    async (field: SettingEditField, value: string) => {
      const commandLine = buildSettingEditCommandLine(field, value)
      if (commandLine === null) {
        await options.appendLogLines([
          "setting -list",
          tSetting("setting.prompt.editInvalid", options.uiLocale)
        ])
        return
      }
      options.submitConstructedLine(commandLine)
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
