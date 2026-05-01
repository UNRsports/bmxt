/**
 * 複数の Effect ハンドラで共有する URL 正規化と tabs -mu 相当のジャンプ。
 */

function parseHttpUrl(urlStr: string): string | null {
  const t = urlStr.trim()
  if (!t) {
    return null
  }
  try {
    const u = new URL(t)
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return null
    }
    return u.href
  } catch {
    return null
  }
}

export async function tabsMoveUrl(normalized: string): Promise<string[]> {
  const tabs = await chrome.tabs.query({})
  const httpTabs = tabs.filter(
    (tab) =>
      tab.id !== undefined &&
      tab.url &&
      (tab.url.startsWith("http://") || tab.url.startsWith("https://"))
  )
  const exact = httpTabs.find((tab) => tab.url === normalized)
  const byOpenedPrefix = httpTabs.find((tab) => tab.url!.startsWith(normalized))
  const byTypedPrefix = httpTabs.find((tab) => {
    const tu = tab.url!
    if (!normalized.startsWith(tu)) {
      return false
    }
    if (normalized.length === tu.length) {
      return true
    }
    const next = normalized[tu.length]
    return next === "/" || next === "?" || next === "#"
  })
  const pick = exact ?? byOpenedPrefix ?? byTypedPrefix
  if (pick?.id !== undefined) {
    await chrome.tabs.update(pick.id, { active: true })
    if (pick.windowId !== undefined) {
      await chrome.windows.update(pick.windowId, { focused: true })
    }
    return [`activated tab ${pick.id}: ${pick.url}`]
  }
  const created = await chrome.tabs.create({ url: normalized })
  return [`opened new tab ${created.id ?? "?"}: ${normalized}`]
}

export function parseHttpUrlForEffect(urlStr: string): string | null {
  return parseHttpUrl(urlStr)
}
