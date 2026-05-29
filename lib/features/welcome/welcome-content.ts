import raw from "./welcome-content.json"

export {
  WELCOME_NONE_HERO_IMAGE,
  isRenderableWelcomeImagePath,
  listWelcomeImagePaths
} from "./welcome-image-paths"

export type WelcomeContentEntry = {
  /**
   * ヒーロー画像（拡張機能ルートからの相対パス）。
   * 画像を出さない版は {@link WELCOME_NONE_HERO_IMAGE} を指定する（キーは省略しない）。
   */
  heroImage?: string
  /** 追加画像（任意件数）。`_none_` で始まるトークンは表示しない。 */
  additionalImages?: string[]
  /** 英語の箇条書き（任意件数）。表示は en → ja の順。 */
  en: string[]
  /** 日本語の箇条書き（任意件数）。 */
  ja: string[]
}

type WelcomeContentMap = Record<string, WelcomeContentEntry>

const MAP = raw as WelcomeContentMap

const PLACEHOLDER_JA = [
  "（このバージョンのウェルカム内容は未登録です。lib/features/welcome/welcome-content.json に追加してください。）"
]
const PLACEHOLDER_EN = [
  "(No welcome content for this version. Add an entry to lib/features/welcome/welcome-content.json.)"
]

export function listWelcomeContentVersions(): string[] {
  return Object.keys(MAP)
}

export function getWelcomeContentForVersion(version: string): WelcomeContentEntry | null {
  const e = MAP[version]
  return e ?? null
}

export function placeholderWelcomeContent(): WelcomeContentEntry {
  return {
    ja: PLACEHOLDER_JA,
    en: PLACEHOLDER_EN,
    additionalImages: []
  }
}

export function resolveWelcomeImageUrl(path: string): string {
  return chrome.runtime.getURL(path)
}
