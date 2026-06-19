/**
 * Rust が返した Effect を Chrome API で実行し、ターミナルに出す行を返す。
 */

import type { ChromeEffect } from "./effect-types"
import type { DispatchChromeContext } from "./dispatch-context"
import { applyOne } from "./handlers/apply-one"

export type { DispatchChromeContext } from "./dispatch-context"

function isParallelSearchEffect(e: ChromeEffect): boolean {
  return e.kind === "search_history" || e.kind === "search_bookmark" || e.kind === "search_page"
}

export async function applyChromeEffects(
  ctx: DispatchChromeContext,
  effects: ChromeEffect[]
): Promise<string[]> {
  if (effects.length > 1 && effects.every(isParallelSearchEffect)) {
    const parts = await Promise.all(effects.map((e) => applyOne(ctx, e)))
    return parts.flat()
  }
  const out: string[] = []
  for (const e of effects) {
    // eslint-disable-next-line no-await-in-loop
    out.push(...(await applyOne(ctx, e)))
  }
  return out
}
