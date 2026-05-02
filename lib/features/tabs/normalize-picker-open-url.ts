/** ピッカーから開く URL。空は新規タブ既定ページ。 */
export function normalizePickerOpenUrl(raw: string): string | undefined {
  const t = raw.trim()
  if (t === "") {
    return undefined
  }
  if (/^(chrome-extension:|chrome:|about:|file:|https?:|moz-extension:)/i.test(t)) {
    return t
  }
  try {
    new URL(t)
    return t
  } catch {
    const withScheme = /^[\w-]+:\/\//.test(t) ? t : `https://${t}`
    try {
      new URL(withScheme)
      return withScheme
    } catch {
      return t
    }
  }
}
