import { parseDomSettingCommandLine } from "../../../dom/parse-dom-setting-command"
import {
  saveDomPageActiveMode,
  settingTokenForDomPageActiveMode,
  DOM_PAGE_ACTIVE_MODE_TOKENS
} from "../../../dom/page-active-setting"
import { tSetting } from "../../../setting/i18n/ns/setting"
import { tDom } from "../../../setting/i18n/ns/dom"
import {
  setContinuationPrompt,
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleDomSettingCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, locale } = ctx

  if (parseDomSettingCommandLine(trimmed) === null) {
    return "not_handled"
  }

  const domSettingCmd = parseDomSettingCommandLine(trimmed)
  if (domSettingCmd === null) {
    return "handled"
  }

  deps.appendCommandToHistory(trimmed)
  recordCommandHistory(deps)
  if (domSettingCmd.kind === "incomplete") {
    setContinuationPrompt(deps, "dom ")
    void deps.appendLogLines([
      `> ${trimmed}`,
      tDom("dom.usage", locale),
      tDom("dom.settingHint", locale)
    ])
    return "handled"
  }
  if (domSettingCmd.kind === "setting-incomplete") {
    setContinuationPrompt(deps, "dom -setting ")
    void deps.appendLogLines([
      `> ${trimmed}`,
      tDom("dom.setting.choose", locale),
      tDom("dom.setting.pageActiveCurrent", locale, {
        token: settingTokenForDomPageActiveMode(deps.domPageActiveModeRef.current)
      })
    ])
    return "handled"
  }
  if (domSettingCmd.kind === "page-active-incomplete") {
    setContinuationPrompt(deps, "dom -setting -page-active ")
    const options = DOM_PAGE_ACTIVE_MODE_TOKENS.join(" | ")
    void deps.appendLogLines([
      `> ${trimmed}`,
      tDom("dom.pageActive.choose", locale, { options }),
      tSetting("setting.language.current", locale, {
        token: settingTokenForDomPageActiveMode(deps.domPageActiveModeRef.current)
      })
    ])
    return "handled"
  }

  clearPrompt(deps)
  deps.lineRef.current = ""
  void (async () => {
    await saveDomPageActiveMode(domSettingCmd.mode)
    deps.setDomPageActiveMode(domSettingCmd.mode)
    deps.domPageActiveModeRef.current = domSettingCmd.mode
    const token = settingTokenForDomPageActiveMode(domSettingCmd.mode)
    await deps.appendLogLines([`> ${trimmed}`, tDom("dom.pageActive.set", locale, { token })])
    deps.focusPrompt()
  })()
  return "handled"
}
