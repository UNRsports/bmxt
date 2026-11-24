import React, { useLayoutEffect, useRef } from "react"
import { getPromptEffectCanvasContext } from "./canvas-context"
import type { PromptEffectPaintQuality } from "./constants"
import { isGeckoPromptEffectHost } from "./is-gecko"
import { paintPromptEffectFrame } from "./paint-frame"
import { trimParticlesToQuality } from "./particle-buffer"
import {
  DEFAULT_PROMPT_EFFECT_THEME_ID,
  resolvePromptEffectTheme,
  type PromptEffectThemeId
} from "./registry"
import { resolvePromptEffectOrigin } from "./resolve-origin"
import type { PromptEffectOrigin, PromptParticle } from "./types"

export type PromptEffectsOverlayProps = {
  enabled: boolean
  /** EN: Theme from the closed registry (default: fire). */
  themeId?: PromptEffectThemeId
  fieldRef: React.RefObject<HTMLElement | null>
  caretRef: React.RefObject<HTMLElement | null>
  line: string
  cursorPos: number
  composition: string
  /**
   * EN: When true on Firefox/Gecko, paint in menu-lite (Chromium keeps full quality).
   * JA: Firefox のみ候補メニュー開で menu-lite。Chromium は常に full。
   */
  candidateMenuOpen?: boolean
}

function resolvePaintQuality(candidateMenuOpen: boolean): PromptEffectPaintQuality {
  if (candidateMenuOpen && isGeckoPromptEffectHost()) {
    return "menuLite"
  }
  return "full"
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
  composition,
  candidateMenuOpen = false
}: PromptEffectsOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<PromptParticle[]>([])
  const rafRef = useRef<number | null>(null)
  const prevLineLenRef = useRef(0)
  const prevCompLenRef = useRef(0)
  const primedRef = useRef(false)
  const enabledRef = useRef(enabled)
  const themeIdRef = useRef(themeId)
  const qualityRef = useRef<PromptEffectPaintQuality>("full")
  const originRef = useRef<PromptEffectOrigin | null>(null)
  const skipFrameRef = useRef(false)
  enabledRef.current = enabled
  themeIdRef.current = themeId
  qualityRef.current = resolvePaintQuality(candidateMenuOpen)

  const stopLoop = (): void => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const clearCanvasHost = (): void => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = getPromptEffectCanvasContext(canvas)
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    canvas.width = 0
    canvas.height = 0
    canvas.style.left = "0px"
    canvas.style.top = "0px"
    canvas.style.width = "0px"
    canvas.style.height = "0px"
  }

  const ensureLoop = (): void => {
    if (rafRef.current !== null) {
      return
    }
    const tick = (): void => {
      const canvas = canvasRef.current
      if (!canvas || !enabledRef.current) {
        rafRef.current = null
        return
      }
      const quality = qualityRef.current
      // EN: Menu-lite on Gecko paints every other frame (~30fps) to yield to the picker.
      if (quality === "menuLite") {
        skipFrameRef.current = !skipFrameRef.current
        if (skipFrameRef.current) {
          rafRef.current = requestAnimationFrame(tick)
          return
        }
      } else {
        skipFrameRef.current = false
      }
      const theme = resolvePromptEffectTheme(themeIdRef.current)
      particlesRef.current = paintPromptEffectFrame(canvas, theme, particlesRef.current, {
        quality,
        origin: originRef.current
      })
      if (particlesRef.current.length === 0) {
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useLayoutEffect(() => {
    const nextQuality = resolvePaintQuality(candidateMenuOpen)
    qualityRef.current = nextQuality
    if (nextQuality === "menuLite") {
      trimParticlesToQuality(particlesRef.current, "menuLite")
    }
  }, [candidateMenuOpen])

  useLayoutEffect(() => {
    if (!enabled) {
      stopLoop()
      particlesRef.current = []
      primedRef.current = false
      prevLineLenRef.current = 0
      prevCompLenRef.current = 0
      originRef.current = null
      clearCanvasHost()
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
    originRef.current = origin
    const quality = qualityRef.current
    const theme = resolvePromptEffectTheme(themeId)
    if (grew) {
      theme.spawn("type", { origin, removedCount: 0, quality }, particlesRef.current)
    }
    if (shrunk) {
      theme.spawn("delete", { origin, removedCount, quality }, particlesRef.current)
    }
    ensureLoop()
  }, [enabled, themeId, fieldRef, caretRef, line, cursorPos, composition, candidateMenuOpen])

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
