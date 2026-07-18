import type { DispatchMsg } from "../../dispatch/effect-types"
import { settingTokenForDomPageActiveMode } from "../../dom/page-active-setting"
import { settingTokenForPageActiveMode } from "../../tabs/page-active-setting"
import { settingTokenForPairId } from "../../translate/translation-pair"
import type { CommandDispatchDeps } from "./command-dispatch/types"

const HOST_TABS = "__HOST_PAGE_ACTIVE__"
const HOST_DOM = "__HOST_DOM_PAGE_ACTIVE__"
const HOST_TRANSLATE = "__HOST_TRANSLATE_PAIR__"

/**
 * EN: Fill Rust sentinel params from live UI state before expand-msgs.
 * JA: expand-msgs 前に、Rust センチネル params をライブ UI 状態で埋める。
 */
export function enrichHostMsgParams(
  msgs: readonly DispatchMsg[],
  deps: CommandDispatchDeps
): DispatchMsg[] {
  return msgs.map((msg) => {
    if (!msg.params) {
      return msg
    }
    const next = { ...msg.params }
    let changed = false
    for (const [key, value] of Object.entries(next)) {
      if (value === HOST_TABS) {
        next[key] = settingTokenForPageActiveMode(deps.tabsPageActiveModeRef.current)
        changed = true
      } else if (value === HOST_DOM) {
        next[key] = settingTokenForDomPageActiveMode(deps.domPageActiveModeRef.current)
        changed = true
      } else if (value === HOST_TRANSLATE) {
        next[key] = settingTokenForPairId(deps.translatePairIdRef.current)
        changed = true
      }
    }
    if (!changed) {
      return msg
    }
    return { ...msg, params: next }
  })
}
