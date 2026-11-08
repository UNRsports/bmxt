/**
 * EN: Extension-page URL helpers — Chrome (`chrome-extension:`) and Firefox (`moz-extension:`).
 *     Production code should prefer `chrome.runtime.getURL` / `browser.runtime.getURL`.
 *     Use these helpers for trust checks, E2E, and tests that must not hard-code one protocol.
 * JA: 拡張ページ URL ヘルパ（Chrome / Firefox）。本番は runtime.getURL を優先。
 *     信頼判定・E2E・テストではプロトコル直書きを避け、ここを使う。
 */

/** EN: Protocol strings as returned by `URL.protocol` (trailing colon). */
export type ExtensionPageProtocol = "chrome-extension:" | "moz-extension:"

export const EXTENSION_PAGE_PROTOCOLS: readonly ExtensionPageProtocol[] = [
  "chrome-extension:",
  "moz-extension:"
] as const

/** EN: Default for Chromium E2E / tooling when the host browser is not specified. */
export const DEFAULT_EXTENSION_PAGE_PROTOCOL: ExtensionPageProtocol = "chrome-extension:"

/** EN: Canonical UI page pathnames (leading slash, no query). */
export const BMXT_UI_PAGE_PATHS = {
  shell: "/bmxt.html",
  float: "/bmxt-float.html"
} as const

export type BmxtUiPageKey = keyof typeof BMXT_UI_PAGE_PATHS

export const TRUSTED_BMXT_UI_PATHS: ReadonlySet<string> = new Set<string>([
  BMXT_UI_PAGE_PATHS.shell,
  BMXT_UI_PAGE_PATHS.float
])

export type ParsedExtensionPageUrl = {
  protocol: ExtensionPageProtocol
  extensionId: string
  pathname: string
}

export function isExtensionPageProtocol(protocol: string): protocol is ExtensionPageProtocol {
  return (
    protocol === "chrome-extension:" || protocol === "moz-extension:"
  )
}

/** EN: Ensure a leading `/` and strip query/hash for pathname compares. */
export function normalizeExtensionPagePath(path: string): string {
  const trimmed = path.trim()
  if (trimmed.length === 0) {
    return "/"
  }
  const noQuery = trimmed.split(/[?#]/, 2)[0] ?? trimmed
  if (noQuery.startsWith("/")) {
    return noQuery
  }
  return `/${noQuery}`
}

/**
 * EN: Build `chrome-extension://id/path` or `moz-extension://id/path` for tests / E2E.
 * JA: テスト・E2E 用の絶対拡張ページ URL を組み立てる。
 */
export function extensionPageUrl(options: {
  extensionId: string
  /** EN: Path or page key — `"bmxt.html"`, `"/bmxt.html"`, or `"shell"` / `"float"`. */
  path: string | BmxtUiPageKey
  protocol?: ExtensionPageProtocol
}): string {
  const id = options.extensionId.trim()
  if (id.length === 0) {
    throw new Error("extensionPageUrl: extensionId must be non-empty")
  }
  const protocol = options.protocol ?? DEFAULT_EXTENSION_PAGE_PROTOCOL
  const pathKey = options.path
  const rawPath =
    pathKey === "shell" || pathKey === "float"
      ? BMXT_UI_PAGE_PATHS[pathKey]
      : normalizeExtensionPagePath(pathKey)
  // EN: URL constructor requires the colon form without double slash in protocol arg —
  //     build via string so both chrome-extension and moz-extension stay explicit.
  return `${protocol}//${id}${rawPath}`
}

/** EN: Parse an absolute extension-page URL; null if not chrome-/moz-extension. */
export function parseExtensionPageUrl(url: string): ParsedExtensionPageUrl | null {
  if (typeof url !== "string" || url.length === 0) {
    return null
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (!isExtensionPageProtocol(parsed.protocol)) {
    return null
  }
  const extensionId = parsed.hostname
  if (extensionId.length === 0) {
    return null
  }
  return {
    protocol: parsed.protocol,
    extensionId,
    pathname: parsed.pathname
  }
}

/**
 * EN: True when `url` is a same-extension page under an allowed pathname set.
 * JA: 同一拡張 ID かつ allowlist パスの拡張ページ URL なら true。
 */
export function isSameExtensionAllowedPageUrl(
  url: string,
  extensionId: string,
  allowedPathnames: ReadonlySet<string> = TRUSTED_BMXT_UI_PATHS
): boolean {
  const parsed = parseExtensionPageUrl(url)
  if (parsed === null) {
    return false
  }
  if (parsed.extensionId !== extensionId) {
    return false
  }
  return allowedPathnames.has(parsed.pathname)
}
