/**
 * EN: Ensure a document owns WebRTC (Chrome offscreen; Firefox opens peer page once).
 * JA: WebRTC 宿主ドキュメントを確保（Chrome offscreen / Firefox peer ページ）。
 */

const OFFSCREEN_URL = "bmxt-offscreen.html"
const PEER_URL = "bmxt-peer.html"

function isFirefox(): boolean {
  return typeof navigator !== "undefined" && /Firefox\//.test(navigator.userAgent)
}

async function hasOffscreenDocument(): Promise<boolean> {
  const offscreen = (chrome as typeof chrome & {
    offscreen?: {
      hasDocument?: () => Promise<boolean>
      createDocument: (params: {
        url: string
        reasons: string[]
        justification: string
      }) => Promise<void>
    }
  }).offscreen
  if (!offscreen?.hasDocument) {
    return false
  }
  try {
    return await offscreen.hasDocument()
  } catch {
    return false
  }
}

export async function ensurePeerDocument(): Promise<void> {
  if (isFirefox()) {
    // EN: Optional dedicated peer page — in-page host in bmxt.html already works while open.
    //     Open peer only when no BMXt UI tab is present (best-effort).
    try {
      const url = chrome.runtime.getURL(PEER_URL)
      const tabs = await chrome.tabs.query({ url })
      if (tabs.length === 0) {
        await chrome.tabs.create({ url, active: false })
      }
    } catch {
      /* ignore — in-page peer remains available */
    }
    return
  }

  const offscreen = (chrome as typeof chrome & {
    offscreen?: {
      hasDocument?: () => Promise<boolean>
      createDocument: (params: {
        url: string
        reasons: string[]
        justification: string
      }) => Promise<void>
    }
  }).offscreen
  if (!offscreen?.createDocument) {
    return
  }
  if (await hasOffscreenDocument()) {
    return
  }
  try {
    await offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ["WEB_RTC"],
      justification:
        "Family sync command bus uses WebRTC DataChannel between BMXt peers on the same PC or LAN; signaling stays on the user-picked local folder."
    })
  } catch {
    /* already exists or unsupported */
  }
}
