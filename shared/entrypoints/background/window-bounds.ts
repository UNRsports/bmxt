/**
 * EN: Shim — window bounds live under lib/features/bmxt-window/.
 * JA: 互換シム。実装は lib/features/bmxt-window/window-bounds.ts。
 */

export {
  BMXT_WINDOW_DEFAULT_HEIGHT,
  BMXT_WINDOW_DEFAULT_WIDTH,
  flushPersistBmxtWindowBounds,
  installPopupWindowBoundsPersist,
  loadBmxtWindowBoundsAsync,
  normalizeBmxtWindowBounds,
  schedulePersistBmxtWindowBounds,
  type BmxtWindowBounds
} from "../../lib/features/bmxt-window/window-bounds"
