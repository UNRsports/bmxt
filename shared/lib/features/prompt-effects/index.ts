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
  computePromptParticleBounds,
  quantizePromptEffectBounds,
  promptParticlePaintRadius,
  PROMPT_EFFECT_BOUNDS_PAD_PX,
  PROMPT_EFFECT_BOUNDS_QUANT_PX,
  type PromptEffectPaintBounds
} from "./particle-bounds"
export type {
  PromptEffectEventKind,
  PromptEffectOrigin,
  PromptEffectSpawnContext,
  PromptEffectTheme,
  PromptParticle
} from "./types"
export { FIRE_THEME_ID, firePromptEffectTheme } from "./themes/fire"
