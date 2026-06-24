import {
  BMXT_WINDOW_ID_KEY,
  LAST_NORMAL_WINDOW_KEY
} from "../extension-storage/keys"
import {
  parseWindowDisplayNamesStore,
  pruneWindowDisplayNamesStore,
  WINDOW_DISPLAY_NAMES_KEY,
  windowDisplayNamesMapFromStore
} from "../extension-storage/window-display-names-store"
import { resolveMirrorBrowserWindowIdFromStorage } from "./resolve-mirror-browser-window"

export type PickerChromeContext = {
  windowDisplayNames: Map<number, string>
  trackedWindowId: number | undefined
  lastNormalWindowId: number | undefined
}

const CACHE_TTL_MS = 200

let cached: { key: string; at: number; context: PickerChromeContext } | null = null
let inflight: { key: string; promise: Promise<PickerChromeContext> } | null = null

function openWindowIdsKey(openWindowIds: readonly number[]): string {
  return [...openWindowIds].sort((a, b) => a - b).join(",")
}

export function invalidatePickerChromeContextCache(): void {
  cached = null
}

async function loadPickerChromeContextUncached(
  openWindowIds: readonly number[]
): Promise<PickerChromeContext> {
  const r = await chrome.storage.local.get([
    WINDOW_DISPLAY_NAMES_KEY,
    BMXT_WINDOW_ID_KEY,
    LAST_NORMAL_WINDOW_KEY
  ])

  let store = parseWindowDisplayNamesStore(r[WINDOW_DISPLAY_NAMES_KEY])
  const pruned = pruneWindowDisplayNamesStore(store, openWindowIds)
  if (pruned.changed) {
    store = pruned.store
    await chrome.storage.local.set({ [WINDOW_DISPLAY_NAMES_KEY]: store })
    cached = null
  }

  const bmxtWid = r[BMXT_WINDOW_ID_KEY] as number | undefined
  const lastNormalRaw = r[LAST_NORMAL_WINDOW_KEY] as number | undefined
  const lastNormalWindowId =
    typeof lastNormalRaw === "number" && Number.isInteger(lastNormalRaw)
      ? lastNormalRaw
      : undefined

  const trackedWindowId = await resolveMirrorBrowserWindowIdFromStorage(
    bmxtWid,
    lastNormalWindowId
  )

  return {
    windowDisplayNames: windowDisplayNamesMapFromStore(store),
    trackedWindowId,
    lastNormalWindowId
  }
}

/** EN: One storage read + mirror resolve for tab/search picker row builds. */
export async function loadPickerChromeContext(
  openWindowIds: readonly number[]
): Promise<PickerChromeContext> {
  const key = openWindowIdsKey(openWindowIds)
  const now = Date.now()
  if (cached && cached.key === key && now - cached.at < CACHE_TTL_MS) {
    return cached.context
  }
  if (inflight?.key === key) {
    return inflight.promise
  }

  const promise = loadPickerChromeContextUncached(openWindowIds)
    .then((context) => {
      cached = { key, at: Date.now(), context }
      return context
    })
    .finally(() => {
      if (inflight?.key === key) {
        inflight = null
      }
    })

  inflight = { key, promise }
  return promise
}
