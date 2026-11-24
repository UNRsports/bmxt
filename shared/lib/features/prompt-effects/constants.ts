/** EN: Soft cap so rapid typing/delete cannot unbounded-grow the buffer. */
export const PROMPT_EFFECT_MAX_PARTICLES = 360

/**
 * EN: Menu-open lite mode (Firefox only) — hard caps while the candidate menu is open.
 * JA: 候補メニュー表示中の lite（Firefox のみ）。粒子数を強く抑える。
 */
export const PROMPT_EFFECT_MENU_LITE_MAX_PARTICLES = 24

/** EN: Type burst count in menu-lite. */
export const PROMPT_EFFECT_MENU_LITE_TYPE_BURST = 3

/** EN: Delete burst count in menu-lite (ignores removedCount scaling). */
export const PROMPT_EFFECT_MENU_LITE_DELETE_BURST = 6

/** EN: Fixed caret-local paint box width (CSS px) in menu-lite. */
export const PROMPT_EFFECT_MENU_LITE_BOX_W = 160

/** EN: Fixed caret-local paint box height (CSS px) in menu-lite. */
export const PROMPT_EFFECT_MENU_LITE_BOX_H = 120

export type PromptEffectPaintQuality = "full" | "menuLite"
