import React, { useLayoutEffect, useRef } from "react"
import { paintPromptEffectFrame } from "./paint-frame"
import {
  DEFAULT_PROMPT_EFFECT_THEME_ID,
  resolvePromptEffectTheme,
  type PromptEffectThemeId
} from "./registry"
import { resolvePromptEffectOrigin } from "./resolve-origin"
import type { PromptParticle } from "./types"

export type PromptEffectsOverlayProps = {
  enabled: boolean
  /** EN: Theme from the closed registry (default: fire). */
  themeId?: PromptEffectThemeId
  fieldRef: React.RefObject<HTMLElement | null>
  caretRef: React.RefObject<HTMLElement | null>
  line: string
  cursorPos: number
  composition: string
}

/**
 * EN: Canvas host for prompt type/delete particle themes (gated by settings).
 * JA: プロンプト入力／削除パーティクルテーマの Canvas ホスト（設定でゲート）。
 */
export function PromptEffectsOverlay({
  enabled,
  themeId = DEFAULT_PROMPT_EFFECT_THEME_ID,
  fieldRef,
  caretRef,
  line,
  cursorPos,
  composition
}: PromptEffectsOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<PromptParticle[]>([])
  const rafRef = useRef<number | null>(null)
  const prevLineLenRef = useRef(0)
  const prevCompLenRef = useRef(0)
  const primedRef = useRef(false)
  const enabledRef = useRef(enabled)
  const themeIdRef = useRef(themeId)
  enabledRef.current = enabled
  themeIdRef.current = themeId

  const stopLoop = (): void => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const ensureLoop = (): void => {
    if (rafRef.current !== null) {
      return
    }
    const tick = (): void => {
      const canvas = canvasRef.current
      const host = fieldRef.current
      if (!canvas || !host || !enabledRef.current) {
        rafRef.current = null
        return
      }
      const theme = resolvePromptEffectTheme(themeIdRef.current)
      particlesRef.current = paintPromptEffectFrame(
        canvas,
        host,
        theme,
        particlesRef.current
      )
      if (particlesRef.current.length === 0) {
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useLayoutEffect(() => {
    if (!enabled) {
      stopLoop()
      particlesRef.current = []
      primedRef.current = false
      prevLineLenRef.current = 0
      prevCompLenRef.current = 0
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
      return
    }

    const lineLen = line.length
    const compLen = composition.length
    if (!primedRef.current) {
      primedRef.current = true
      prevLineLenRef.current = lineLen
      prevCompLenRef.current = compLen
      return
    }

    const prevLineLen = prevLineLenRef.current
    const prevCompLen = prevCompLenRef.current
    const grew = lineLen > prevLineLen || compLen > prevCompLen
    const shrunk = lineLen < prevLineLen || compLen < prevCompLen
    const removedCount =
      Math.max(0, prevLineLen - lineLen) + Math.max(0, prevCompLen - compLen)
    prevLineLenRef.current = lineLen
    prevCompLenRef.current = compLen
    if (!grew && !shrunk) {
      return
    }

    const field = fieldRef.current
    if (!field) {
      return
    }
    const origin = resolvePromptEffectOrigin(field, caretRef.current, cursorPos)
    const theme = resolvePromptEffectTheme(themeId)
    if (grew) {
      theme.spawn("type", { origin, removedCount: 0 }, particlesRef.current)
    }
    if (shrunk) {
      theme.spawn("delete", { origin, removedCount }, particlesRef.current)
    }
    ensureLoop()
  }, [enabled, themeId, fieldRef, caretRef, line, cursorPos, composition])

  useLayoutEffect(() => {
    return () => {
      stopLoop()
    }
  }, [])

  if (!enabled) {
    return null
  }

  return <canvas ref={canvasRef} className="bmxt-prompt-effects-canvas" aria-hidden />
}
