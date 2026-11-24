export {
  PromptEffectsOverlay,
  type PromptEffectsOverlayProps
} from "./PromptEffectsOverlay"
export {
  DEFAULT_PROMPT_EFFECT_THEME_ID,
  PROMPT_EFFECT_THEMES,
  resolvePromptEffectTheme,
  type PromptEffectThemeId
} from "./registry"
export {
  PROMPT_EFFECT_MAX_PARTICLES,
  PROMPT_EFFECT_MENU_LITE_BOX_H,
  PROMPT_EFFECT_MENU_LITE_BOX_W,
  PROMPT_EFFECT_MENU_LITE_DELETE_BURST,
  PROMPT_EFFECT_MENU_LITE_MAX_PARTICLES,
  PROMPT_EFFECT_MENU_LITE_TYPE_BURST,
  type PromptEffectPaintQuality
} from "./constants"
export { isGeckoPromptEffectHost } from "./is-gecko"
export { resolveMenuLitePaintBox } from "./menu-lite-box"
export {
  computePromptParticleBounds,
  quantizePromptEffectBounds,
  promptParticlePaintRadius,
  PROMPT_EFFECT_BOUNDS_PAD_PX,
  PROMPT_EFFECT_BOUNDS_QUANT_PX,
  type PromptEffectPaintBounds
} from "./particle-bounds"
export { promptEffectParticleCap, trimParticlesToQuality } from "./particle-buffer"
export type {
  PromptEffectEventKind,
  PromptEffectOrigin,
  PromptEffectSpawnContext,
  PromptEffectTheme,
  PromptParticle
} from "./types"
export { FIRE_THEME_ID, firePromptEffectTheme } from "./themes/fire"
