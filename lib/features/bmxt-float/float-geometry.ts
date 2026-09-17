/**
 * EN: Free-form float host rectangle — nudge (move/resize), clamp, defaults.
 * JA: フロート自由矩形の移動／リサイズ・クランプ・既定値。
 */

import {
  FLOAT_DEFAULT_CORNER,
  FLOAT_VIEWPORT_MARGIN_PX,
  cornerToRect,
  type FloatRect
} from "./float-host-placement.ts"

export const FLOAT_DEFAULT_WIDTH = 520
export const FLOAT_DEFAULT_HEIGHT = 360
export const FLOAT_MIN_WIDTH = 280
export const FLOAT_MIN_HEIGHT = 200
export const FLOAT_MAX_WIDTH = 4096
export const FLOAT_MAX_HEIGHT = 4096
export const FLOAT_GEOMETRY_STEP_PX = FLOAT_VIEWPORT_MARGIN_PX

export type FloatGeometryNudgeMode = "move" | "resize"

export type FloatGeometryArrow = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"

export function defaultFloatGeometry(
  viewportWidth: number,
  viewportHeight: number
): FloatRect {
  const width = Math.min(
    FLOAT_DEFAULT_WIDTH,
    Math.max(FLOAT_MIN_WIDTH, viewportWidth - FLOAT_VIEWPORT_MARGIN_PX * 2)
  )
  const height = Math.min(
    FLOAT_DEFAULT_HEIGHT,
    Math.max(FLOAT_MIN_HEIGHT, viewportHeight - FLOAT_VIEWPORT_MARGIN_PX * 2)
  )
  return cornerToRect(
    FLOAT_DEFAULT_CORNER,
    viewportWidth,
    viewportHeight,
    width,
    height,
    FLOAT_VIEWPORT_MARGIN_PX
  )
}

export function normalizeFloatGeometry(
  raw: unknown,
  viewportWidth: number,
  viewportHeight: number
): FloatRect | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const rec = raw as Record<string, unknown>
  if (
    typeof rec.left !== "number" ||
    typeof rec.top !== "number" ||
    typeof rec.width !== "number" ||
    typeof rec.height !== "number"
  ) {
    return null
  }
  if (
    !Number.isFinite(rec.left) ||
    !Number.isFinite(rec.top) ||
    !Number.isFinite(rec.width) ||
    !Number.isFinite(rec.height)
  ) {
    return null
  }
  const width = Math.round(rec.width)
  const height = Math.round(rec.height)
  if (
    width < FLOAT_MIN_WIDTH ||
    height < FLOAT_MIN_HEIGHT ||
    width > FLOAT_MAX_WIDTH ||
    height > FLOAT_MAX_HEIGHT
  ) {
    return null
  }
  return clampFloatGeometry(
    {
      left: Math.round(rec.left),
      top: Math.round(rec.top),
      width,
      height
    },
    viewportWidth,
    viewportHeight
  )
}

/**
 * EN: Keep size; move into the viewport with margin. Shrink only when viewport is too small.
 */
export function clampFloatGeometry(
  rect: FloatRect,
  viewportWidth: number,
  viewportHeight: number
): FloatRect {
  const margin = FLOAT_VIEWPORT_MARGIN_PX
  const maxWidth = Math.max(FLOAT_MIN_WIDTH, viewportWidth - margin * 2)
  const maxHeight = Math.max(FLOAT_MIN_HEIGHT, viewportHeight - margin * 2)
  const width = Math.min(Math.max(rect.width, FLOAT_MIN_WIDTH), maxWidth, FLOAT_MAX_WIDTH)
  const height = Math.min(Math.max(rect.height, FLOAT_MIN_HEIGHT), maxHeight, FLOAT_MAX_HEIGHT)
  const maxLeft = Math.max(margin, viewportWidth - width - margin)
  const maxTop = Math.max(margin, viewportHeight - height - margin)
  const left = Math.min(Math.max(rect.left, margin), maxLeft)
  const top = Math.min(Math.max(rect.top, margin), maxTop)
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height)
  }
}

/**
 * EN: Shift+Alt+arrows — move top-left (size fixed).
 *     Shift+Ctrl+arrows — move bottom-right (top-left fixed = resize).
 */
export function nudgeFloatGeometry(
  rect: FloatRect,
  mode: FloatGeometryNudgeMode,
  arrow: FloatGeometryArrow,
  viewportWidth: number,
  viewportHeight: number,
  stepPx: number = FLOAT_GEOMETRY_STEP_PX
): FloatRect {
  const step = Number.isFinite(stepPx) && stepPx > 0 ? stepPx : FLOAT_GEOMETRY_STEP_PX
  let next: FloatRect = { ...rect }

  if (mode === "move") {
    if (arrow === "ArrowLeft") {
      next = { ...next, left: next.left - step }
    } else if (arrow === "ArrowRight") {
      next = { ...next, left: next.left + step }
    } else if (arrow === "ArrowUp") {
      next = { ...next, top: next.top - step }
    } else if (arrow === "ArrowDown") {
      next = { ...next, top: next.top + step }
    }
    return clampFloatGeometry(next, viewportWidth, viewportHeight)
  }

  // resize: top-left fixed; nudge bottom-right
  if (arrow === "ArrowLeft") {
    next = { ...next, width: next.width - step }
  } else if (arrow === "ArrowRight") {
    next = { ...next, width: next.width + step }
  } else if (arrow === "ArrowUp") {
    next = { ...next, height: next.height - step }
  } else if (arrow === "ArrowDown") {
    next = { ...next, height: next.height + step }
  }
  return clampFloatGeometry(next, viewportWidth, viewportHeight)
}

export function isFloatGeometryArrow(key: string): key is FloatGeometryArrow {
  return (
    key === "ArrowUp" ||
    key === "ArrowDown" ||
    key === "ArrowLeft" ||
    key === "ArrowRight"
  )
}

/**
 * EN: Detect float geometry keybind from a keyboard event-like object.
 * JA: フロート移動／リサイズ用キーバインド判定。
 */
export function resolveFloatGeometryNudge(
  event: Pick<KeyboardEvent, "key" | "shiftKey" | "ctrlKey" | "metaKey" | "altKey">
): { mode: FloatGeometryNudgeMode; arrow: FloatGeometryArrow } | null {
  if (!event.shiftKey || !isFloatGeometryArrow(event.key)) {
    return null
  }
  if (event.ctrlKey && !event.metaKey && !event.altKey) {
    return { mode: "resize", arrow: event.key }
  }
  if (event.altKey && !event.ctrlKey && !event.metaKey) {
    return { mode: "move", arrow: event.key }
  }
  return null
}
