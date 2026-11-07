/**
 * EN: Brave disables File System Access by default (`brave://flags/#file-system-access-api`).
 * JA: Brave は既定で File System Access を無効（`brave://flags/#file-system-access-api`）。
 */

type NavigatorWithBrave = Navigator & {
  brave?: {
    isBrave?: () => Promise<boolean>
  }
}

export function looksLikeBraveSync(): boolean {
  if (typeof navigator === "undefined") {
    return false
  }
  const nav = navigator as NavigatorWithBrave
  if (nav.brave !== undefined && typeof nav.brave.isBrave === "function") {
    return true
  }
  const ua = typeof nav.userAgent === "string" ? nav.userAgent : ""
  if (/Brave/i.test(ua)) {
    return true
  }
  const brands = (
    nav as Navigator & {
      userAgentData?: { brands?: Array<{ brand: string }> }
    }
  ).userAgentData?.brands
  if (Array.isArray(brands)) {
    for (const entry of brands) {
      if (typeof entry.brand === "string" && /Brave/i.test(entry.brand)) {
        return true
      }
    }
  }
  return false
}
