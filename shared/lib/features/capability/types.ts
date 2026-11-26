/** EN: One browser-API capability probe row. */
export type CapabilityId =
  | "tabs"
  | "windows"
  | "tabGroups"
  | "bookmarks"
  | "history"
  | "scriptingHost"
  | "webrtc"
  | "fsa"
  | "translator"

export type CapabilityStatus = "ok" | "ng"

export type CapabilityProbeRow = {
  id: CapabilityId
  status: CapabilityStatus
}

export type CapabilityProbeReport = {
  checkedAtMs: number
  rows: CapabilityProbeRow[]
}
