/** EN: Normalize/validate a URL for open/navigate effects — http(s) only. */
export function parseOpenHttpUrl(urlStr: string): string | null {
  const trimmed = urlStr.trim()
  if (!trimmed) {
    return null
  }
  try {
    const u = new URL(trimmed)
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return null
    }
    return u.href
  } catch {
    return null
  }
}
