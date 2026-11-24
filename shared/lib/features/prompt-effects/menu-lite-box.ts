import {
  PROMPT_EFFECT_MENU_LITE_BOX_H,
  PROMPT_EFFECT_MENU_LITE_BOX_W
} from "./constants.ts"
import type { PromptEffectOrigin } from "./types.ts"

/**
 * EN: Fixed caret-local box for menu-lite (no rising AABB growth under the picker).
 * JA: menu-lite 用のキャレット固定箱（上昇 AABB でメニュー下を広げない）。
 */
export function resolveMenuLitePaintBox(
  origin: PromptEffectOrigin,
  stageW: number,
  stageH: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  const boxW = PROMPT_EFFECT_MENU_LITE_BOX_W
  const boxH = PROMPT_EFFECT_MENU_LITE_BOX_H
  let minX = Math.floor(origin.x - boxW * 0.45)
  let minY = Math.floor(origin.y - boxH * 0.75)
  minX = Math.max(0, Math.min(minX, Math.max(0, stageW - boxW)))
  minY = Math.max(0, Math.min(minY, Math.max(0, stageH - boxH)))
  const maxX = Math.min(stageW, minX + boxW)
  const maxY = Math.min(stageH, minY + boxH)
  return { minX, minY, maxX, maxY }
}
