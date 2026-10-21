import { tEffect, type EffectMessageKey } from "../../setting/i18n/ns/effect"
import { getRunLocale } from "../../setting/i18n/run-locale"
import type { MessageVars } from "../../setting/i18n/format-message"
import type { DispatchHostContext } from "../dispatch-context"

export function effectT(
  ctx: DispatchHostContext,
  key: EffectMessageKey,
  vars?: MessageVars
): string {
  return tEffect(key, ctx.uiLocale ?? getRunLocale(), vars)
}
