/**
 * EN: Persist BMXt popup window size across launches.
 * JA: BMXt ポップアップ窓サイズの保存・復元。
 */

import { BMXT_WINDOW_BOUNDS_KEY } from "../../lib/features/extension-storage/keys"

export const BMXT_WINDOW_DEFAULT_WIDTH = 780
export const BMXT_WINDOW_DEFAULT_HEIGHT = 580

const MIN_WIDTH = 320
const MIN_HEIGHT = 240
const MAX_WIDTH = 4096
const MAX_HEIGHT = 4096

export type BmxtWindowBounds = {
  width: number
  height: number
}

export function normalizeBmxtWindowBounds(
  width: unknown,
  height: unknown
): BmxtWindowBounds | null {
  if (typeof width !== "number" || typeof height !== "number") {
    return null
  }
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null
  }
  const w = Math.round(width)
  const h = Math.round(height)
  if (w < MIN_WIDTH || h < MIN_HEIGHT || w > MAX_WIDTH || h > MAX_HEIGHT) {
    return null
  }
  return { width: w, height: h }
}

export async function loadBmxtWindowBoundsAsync(): Promise<BmxtWindowBounds> {
  const r = await chrome.storage.local.get(BMXT_WINDOW_BOUNDS_KEY)
  const stored = r[BMXT_WINDOW_BOUNDS_KEY]
  if (stored !== null && typeof stored === "object") {
    const rec = stored as Record<string, unknown>
    const normalized = normalizeBmxtWindowBounds(rec.width, rec.height)
    if (normalized !== null) {
      return normalized
    }
  }
  return {
    width: BMXT_WINDOW_DEFAULT_WIDTH,
    height: BMXT_WINDOW_DEFAULT_HEIGHT
  }
}

let boundsPersistTimer: ReturnType<typeof setTimeout> | undefined
let pendingBounds: BmxtWindowBounds | undefined

export function schedulePersistBmxtWindowBounds(bounds: BmxtWindowBounds): void {
  pendingBounds = bounds
  if (boundsPersistTimer !== undefined) {
    clearTimeout(boundsPersistTimer)
  }
  boundsPersistTimer = setTimeout(() => {
    boundsPersistTimer = undefined
    const toSave = pendingBounds
    pendingBounds = undefined
    if (toSave !== undefined) {
      void chrome.storage.local.set({ [BMXT_WINDOW_BOUNDS_KEY]: toSave })
    }
  }, 400)
}

export function flushPersistBmxtWindowBounds(): void {
  if (boundsPersistTimer !== undefined) {
    clearTimeout(boundsPersistTimer)
    boundsPersistTimer = undefined
  }
  const toSave = pendingBounds
  pendingBounds = undefined
  if (toSave !== undefined) {
    void chrome.storage.local.set({ [BMXT_WINDOW_BOUNDS_KEY]: toSave })
  }
}
