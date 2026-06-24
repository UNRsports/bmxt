import {
  listTranslationPairSettingTokens,
  parseTranslateCommandLine,
  saveTranslateEnabled,
  saveTranslatePair,
  settingTokenForPairId
} from "../../../translate"
import { translateOnLogLine } from "../../../setting/i18n/resolvers"
import { tSetting } from "../../../setting/i18n/ns/setting"
import { tTranslate } from "../../../setting/i18n/ns/translate"
import { activateModeToolbar, deactivateModeToolbar } from "../../mode-toolbar-order"
import {
  clearPrompt,
  recordCommandHistory,
  setContinuationPrompt,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleTranslateCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, locale } = ctx

  const translateCmd = parseTranslateCommandLine(trimmed)
  if (translateCmd === null) {
    return "not_handled"
  }

  deps.appendCommandToHistory(trimmed)
  recordCommandHistory(deps)
  if (translateCmd.kind === "incomplete") {
    setContinuationPrompt(deps, "translate ")
    void deps.appendLogLines([
      `> ${trimmed}`,
      tTranslate("translate.usage", locale),
      tTranslate("translate.usageHint", locale)
    ])
    return "handled"
  }
  if (translateCmd.kind === "setting-incomplete") {
    setContinuationPrompt(deps, "translate -setting ")
    const options = listTranslationPairSettingTokens().join(" | ")
    void deps.appendLogLines([
      `> ${trimmed}`,
      tTranslate("translate.setting.choose", locale, { options }),
      tSetting("setting.language.current", locale, {
        token: settingTokenForPairId(deps.translatePairIdRef.current)
      })
    ])
    return "handled"
  }

  clearPrompt(deps)
  deps.lineRef.current = ""
  void (async () => {
    if (translateCmd.kind === "on") {
      await saveTranslateEnabled(true)
      deps.setTranslateEnabled(true)
      deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "translate"))
      await deps.appendLogLines([
        `> ${trimmed}`,
        translateOnLogLine(deps.uiSettings.locale, settingTokenForPairId(deps.translatePairIdRef.current))
      ])
      deps.focusPrompt()
    } else if (translateCmd.kind === "off") {
      await saveTranslateEnabled(false)
      deps.setTranslateEnabled(false)
      deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "translate"))
      await deps.appendLogLines([`> ${trimmed}`, tTranslate("translate.off", locale)])
      deps.activatePaneFocus("terminal")
    } else if (translateCmd.kind === "setting") {
      await saveTranslatePair(translateCmd.pair)
      deps.setTranslatePairId(translateCmd.pair)
      deps.resetNavTranslateSession()
      const token = settingTokenForPairId(translateCmd.pair)
      await deps.appendLogLines([`> ${trimmed}`, tTranslate("translate.pairSet", locale, { token })])
    }
  })()
  return "handled"
}
