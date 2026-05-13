/** EN: True for ordinary web pages (scripting / optional host access apply). */
export function isHttpUrl(url: string | undefined): boolean {
  if (!url) {
    return false
  }
  return url.startsWith("http://") || url.startsWith("https://")
}
