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
    if (ctx.shouldCancel?.()) {
      return []
    }
    const parts = await Promise.all(
      effects.map(async (e) => {
        if (ctx.shouldCancel?.()) {
          return [] as string[]
        }
        return applyOne(ctx, e)
      })
    )
    // EN: Parent cancel discards sibling results — partial scope hits must not surface.
    // JA: 親キャンセル時は兄弟スコープの部分結果も捨てる。
    if (ctx.shouldCancel?.()) {
      return []
    }
    return parts.flat()
  }
  const out: string[] = []
  for (const e of effects) {
    if (ctx.shouldCancel?.()) {
      break
    }
    // eslint-disable-next-line no-await-in-loop
    out.push(...(await applyOne(ctx, e)))
  }
  if (ctx.shouldCancel?.()) {
    return []
  }
  return out
}
