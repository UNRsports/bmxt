/** EN: `chrome.tabs.sendMessage` / injected listener channel id. */
export const NAV_MESSAGE_CHANNEL = "bmxt-nav-v1" as const

export type NavMessage =
  | { channel: typeof NAV_MESSAGE_CHANNEL; action: "move"; dx: number; dy: number }
  | { channel: typeof NAV_MESSAGE_CHANNEL; action: "click" }
  | { channel: typeof NAV_MESSAGE_CHANNEL; action: "stop" }
  | { channel: typeof NAV_MESSAGE_CHANNEL; action: "ping" }

export type NavMessageResponse =
  | { ok: true; x: number; y: number; clicked?: boolean }
  | { ok: false; reason?: string }
