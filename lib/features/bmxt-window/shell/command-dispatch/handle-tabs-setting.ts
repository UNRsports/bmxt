import { parseTabsSettingCommandLine } from "../../../tabs/parse-tabs-setting-command"
import {
  saveTabsPageActiveMode,
  settingTokenForPageActiveMode,
  TABS_PAGE_ACTIVE_MODE_TOKENS
} from "../../../tabs/page-active-setting"
import { tSetting } from "../../../setting/i18n/ns/setting"
import { tTabs } from "../../../setting/i18n/ns/tabs"
import {
  setContinuationPrompt,
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleTabsSettingCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, locale } = ctx

  if (parseTabsSettingCommandLine(trimmed) === null) {
    return "not_handled"
  }

  const tabsSettingCmd = parseTabsSettingCommandLine(trimmed)
  if (tabsSettingCmd === null) {
    return "handled"
  }

  deps.appendCommandToHistory(trimmed)
  recordCommandHistory(deps)
  if (tabsSettingCmd.kind === "incomplete") {
    setContinuationPrompt(deps, "tabs ")
    void deps.appendLogLines([
      `> ${trimmed}`,
      tTabs("tabs.usage", locale),
      tTabs("tabs.settingHint", locale)
    ])
    return "handled"
  }
  if (tabsSettingCmd.kind === "setting-incomplete") {
    setContinuationPrompt(deps, "tabs -setting ")
    void deps.appendLogLines([
      `> ${trimmed}`,
      tTabs("tabs.setting.choose", locale),
      tTabs("tabs.setting.pageActiveCurrent", locale, {
        token: settingTokenForPageActiveMode(deps.tabsPageActiveModeRef.current)
      })
    ])
    return "handled"
  }
  if (tabsSettingCmd.kind === "page-active-incomplete") {
    setContinuationPrompt(deps, "tabs -setting -page-active ")
    const options = TABS_PAGE_ACTIVE_MODE_TOKENS.join(" | ")
    void deps.appendLogLines([
      `> ${trimmed}`,
      tTabs("tabs.pageActive.choose", locale, { options }),
      tSetting("setting.language.current", locale, {
        token: settingTokenForPageActiveMode(deps.tabsPageActiveModeRef.current)
      })
    ])
    return "handled"
  }

  clearPrompt(deps)
  deps.lineRef.current = ""
  void (async () => {
    await saveTabsPageActiveMode(tabsSettingCmd.mode)
    deps.setTabsPageActiveMode(tabsSettingCmd.mode)
    deps.tabsPageActiveModeRef.current = tabsSettingCmd.mode
    const token = settingTokenForPageActiveMode(tabsSettingCmd.mode)
    await deps.appendLogLines([`> ${trimmed}`, tTabs("tabs.pageActive.set", locale, { token })])
    deps.focusPrompt()
  })()
  return "handled"
}
