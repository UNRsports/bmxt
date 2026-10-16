/** EN: True for ordinary web pages (scripting / required http(s) host_permissions apply). */
export function isHttpUrl(url: string | undefined): boolean {
  if (!url) {
    return false
  }
  return url.startsWith("http://") || url.startsWith("https://")
}
