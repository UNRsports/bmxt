import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { DEFAULT_UI_LOCALE } from "../../../setting/locale"
import { runTabsListPlain } from "../../../tabs/tabs-list-plain"

type E = Extract<ChromeEffect, { kind: "tabs_list" }>

export async function applyTabsListEffect(ctx: DispatchChromeContext, e: E): Promise<string[]> {
  const locale = ctx.uiLocale ?? DEFAULT_UI_LOCALE
  const showUrl = e.show_url === "true"
  return runTabsListPlain({ showUrl, locale })
}
