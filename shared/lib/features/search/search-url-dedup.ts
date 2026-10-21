/** EN: Scheme/query-agnostic key for merging search hits on the same page. */
export function normalizeUrlForSearchDedup(url: string): string {
  try {
    const u = new URL(url.trim())
    let host = u.hostname.toLowerCase()
    if (host.startsWith("www.")) {
      host = host.slice(4)
    }
    let path = u.pathname
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1)
    }
    return `${host}${path}`
  } catch {
    return url.trim().toLowerCase()
  }
}
