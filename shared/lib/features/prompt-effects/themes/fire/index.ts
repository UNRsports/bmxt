import type {
  PromptEffectEventKind,
  PromptEffectSpawnContext,
  PromptEffectTheme,
  PromptParticle
} from "../../types"
import { stepAndPaintFireParticle } from "./render"
import { spawnFireDeleteBurst, spawnFireTypeBurst } from "./spawn"
import { FIRE_THEME_ID } from "./theme-id"

export { FIRE_THEME_ID } from "./theme-id"

/** EN: Default prompt-fire theme — flame on type, glitter shatter on delete. */
export const firePromptEffectTheme: PromptEffectTheme = {
  id: FIRE_THEME_ID,
  spawn(event: PromptEffectEventKind, ctx: PromptEffectSpawnContext, out: PromptParticle[]): void {
    if (event === "type") {
      spawnFireTypeBurst(out, ctx.origin, ctx.quality)
      return
    }
    spawnFireDeleteBurst(out, ctx.origin, ctx.removedCount, ctx.quality)
  },
  stepAndPaint(ctx, particle, quality): boolean {
    return stepAndPaintFireParticle(ctx, particle, quality)
  }
}
