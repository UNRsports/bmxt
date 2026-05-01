/**
 * Rust が返した Effect を Chrome API で実行し、ターミナルに出す行を返す。
 */

import type { ChromeEffect } from "./effect-types"
import type { DispatchChromeContext } from "./dispatch-context"
import { applyOne } from "./handlers/apply-one"

export type { DispatchChromeContext } from "./dispatch-context"

export async function applyChromeEffects(
  ctx: DispatchChromeContext,
  effects: ChromeEffect[]
): Promise<string[]> {
  const out: string[] = []
  for (const e of effects) {
    // eslint-disable-next-line no-await-in-loop
    out.push(...(await applyOne(ctx, e)))
  }
  return out
}
