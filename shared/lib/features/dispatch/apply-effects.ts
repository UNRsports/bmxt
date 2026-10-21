/**
 * Rust が返した HostEffect をホスト API で実行し、ターミナルに出す行を返す。
 */

import type { HostEffect } from "./effect-types"
import type { DispatchHostContext } from "./dispatch-context"
import { applyOne } from "./handlers/apply-one"
import { isParallelSearchEffect } from "../search/search-effect-parallel"

export type { DispatchHostContext } from "./dispatch-context"

export async function applyHostEffects(
  ctx: DispatchHostContext,
  effects: HostEffect[]
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
