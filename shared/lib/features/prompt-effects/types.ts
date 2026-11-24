/**
 * EN: Shared particle + theme contracts for prompt typing/delete effects.
 * JA: プロンプト入力／削除エフェクト共通のパーティクルとテーマ契約。
 */

export type PromptEffectEventKind = "type" | "delete"

export type PromptParticle = {
  /** EN: Theme that owns spawn/render for this particle. */
  themeId: string
  /** EN: Theme-local variant (e.g. fire theme: "flame" | "shatter"). */
  variant: string
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  /** EN: Theme-defined scalar (heat, sparkle seed, …). */
  heat: number
  spin: number
}

export type PromptEffectOrigin = {
  x: number
  y: number
}

export type PromptEffectSpawnContext = {
  origin: PromptEffectOrigin
  /** EN: Characters removed on delete events (0 on type). */
  removedCount: number
}

/**
 * EN: One visual theme — spawn on type/delete, then step+paint each particle.
 * JA: 1 テーマ＝入力／削除の spawn と、各粒子の step+描画。
 */
export type PromptEffectTheme = {
  id: string
  spawn(event: PromptEffectEventKind, ctx: PromptEffectSpawnContext, out: PromptParticle[]): void
  /**
   * EN: Advance physics and draw one live particle. Return false when finished.
   * JA: 物理更新と描画。寿命切れなら false。
   */
  stepAndPaint(ctx: CanvasRenderingContext2D, particle: PromptParticle): boolean
}
