import { t, type MessageKey, type MessageVars } from "../../setting/i18n/messages"
import { getRunLocale } from "../../setting/i18n/run-locale"
import type { DispatchChromeContext } from "../dispatch-context"

export function effectT(
  ctx: DispatchChromeContext,
  key: MessageKey,
  vars?: MessageVars
): string {
  return t(key, ctx.uiLocale ?? getRunLocale(), vars)
}
