import { firePromptEffectTheme, FIRE_THEME_ID } from "./themes/fire"
import type { PromptEffectTheme } from "./types"

/**
 * EN: Closed set of prompt effect themes. Add new themes under `themes/<id>/`
 *     and register them here.
 * JA: プロンプトエフェクトテーマの閉集合。追加時は `themes/<id>/` を作りここに登録。
 */
export const PROMPT_EFFECT_THEMES = {
  [FIRE_THEME_ID]: firePromptEffectTheme
} as const satisfies Record<string, PromptEffectTheme>

export type PromptEffectThemeId = keyof typeof PROMPT_EFFECT_THEMES

export const DEFAULT_PROMPT_EFFECT_THEME_ID: PromptEffectThemeId = FIRE_THEME_ID

export function resolvePromptEffectTheme(themeId: PromptEffectThemeId): PromptEffectTheme {
  return PROMPT_EFFECT_THEMES[themeId]
}
