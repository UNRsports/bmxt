/** `tabs/welcome.html` のクエリ: 表示する welcome-content.json のキー（例: `0.3.8`）。 */
export const WELCOME_VERSION_QUERY_PARAM = "version"

/** package.json / manifest と同系のバージョン文字列のみ許可。 */
const WELCOME_VERSION_PARAM_RE = /^\d+(\.\d+)*$/

export type WelcomeDisplayVersion = {
  version: string
  /** `?version=` で版を指定して開いている（プレビュー用 URL）。 */
  fromUrlQuery: boolean
}

/**
 * 表示する版を決める。クエリなしは manifest 版（従来どおり）。
 * `?version=` があるときは形式を検証し、welcome-content.json に無くてもその版ラベルでプレースホルダ表示可。
 */
export function resolveWelcomeDisplayVersion(
  searchParams: URLSearchParams,
  manifestVersion: string,
  knownVersions: readonly string[]
): WelcomeDisplayVersion {
  const raw = searchParams.get(WELCOME_VERSION_QUERY_PARAM)?.trim()
  if (!raw || !WELCOME_VERSION_PARAM_RE.test(raw)) {
    return { version: manifestVersion, fromUrlQuery: false }
  }

  const known = new Set(knownVersions)
  if (!known.has(raw)) {
    return { version: raw, fromUrlQuery: true }
  }

  return { version: raw, fromUrlQuery: true }
}
