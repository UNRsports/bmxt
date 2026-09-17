/**
 * EN: Persist in-page float host rectangle across tabs/sessions (`chrome.storage.local`).
 * JA: サイト上フロート矩形の保存・復元（タブ横断・local）。
 */

import { FLOAT_GEOMETRY_KEY } from "../extension-storage/keys.ts"
import type { FloatRect } from "./float-host-placement.ts"
import {
  defaultFloatGeometry,
  normalizeFloatGeometry
} from "./float-geometry.ts"

export async function loadFloatGeometryAsync(
  viewportWidth: number,
  viewportHeight: number
): Promise<FloatRect> {
  try {
    const r = await chrome.storage.local.get(FLOAT_GEOMETRY_KEY)
    const stored = r[FLOAT_GEOMETRY_KEY]
    const normalized = normalizeFloatGeometry(stored, viewportWidth, viewportHeight)
    if (normalized !== null) {
      return normalized
    }
  } catch {
    /* storage unavailable */
  }
  return defaultFloatGeometry(viewportWidth, viewportHeight)
}

let geometryPersistTimer: ReturnType<typeof setTimeout> | undefined
let pendingGeometry: FloatRect | undefined

export function schedulePersistFloatGeometry(rect: FloatRect): void {
  pendingGeometry = {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  }
  if (geometryPersistTimer !== undefined) {
    clearTimeout(geometryPersistTimer)
  }
  geometryPersistTimer = setTimeout(() => {
    geometryPersistTimer = undefined
    const toSave = pendingGeometry
    pendingGeometry = undefined
    if (toSave !== undefined) {
      void chrome.storage.local.set({ [FLOAT_GEOMETRY_KEY]: toSave }).catch(() => {
        /* storage unavailable */
      })
    }
  }, 400)
}

export function flushPersistFloatGeometry(): void {
  if (geometryPersistTimer !== undefined) {
    clearTimeout(geometryPersistTimer)
    geometryPersistTimer = undefined
  }
  const toSave = pendingGeometry
  pendingGeometry = undefined
  if (toSave !== undefined) {
    void chrome.storage.local.set({ [FLOAT_GEOMETRY_KEY]: toSave }).catch(() => {
      /* storage unavailable */
    })
  }
}

/** EN: Persist immediately (avoidance snap / explicit set). */
export function persistFloatGeometryNow(rect: FloatRect): void {
  flushPersistFloatGeometry()
  const toSave = {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  }
  void chrome.storage.local.set({ [FLOAT_GEOMETRY_KEY]: toSave }).catch(() => {
    /* storage unavailable */
  })
}
