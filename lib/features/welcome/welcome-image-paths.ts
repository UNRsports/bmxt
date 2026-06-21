/** heroImage に画像なしを明示するときのセンチネル（実ファイルパスではない）。 */
export const WELCOME_NONE_HERO_IMAGE = "_none_heroImage"

export type WelcomeImageFields = {
  heroImage?: string
  /** hero 画像の CSS max-width（数値は px、文字列は `640px` / `80%` など）。 */
  heroImageMaxWidth?: number | string
  additionalImages?: string[]
}

/** ウェルカムページに描画する実パスか（センチネル・空は false）。 */
export function isRenderableWelcomeImagePath(
  path: string | undefined
): path is string {
  if (!path) {
    return false
  }
  if (path === WELCOME_NONE_HERO_IMAGE) {
    return false
  }
  if (path.startsWith("_none_")) {
    return false
  }
  return true
}

/** JSON の heroImageMaxWidth を CSS max-width に変換する。不正値は undefined。 */
export function resolveHeroImageMaxWidthCss(
  value: number | string | undefined
): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      return undefined
    }
    return `${value}px`
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  if (/^\d+$/.test(trimmed)) {
    return `${trimmed}px`
  }
  if (/^[\d.]+(px|%|rem|em|vw|vh|ch)$/.test(trimmed)) {
    return trimmed
  }
  return undefined
}

/** heroImage と additionalImages から表示用パス一覧を組み立てる。 */
export function listWelcomeImagePaths(entry: WelcomeImageFields): string[] {
  const paths: string[] = []
  if (isRenderableWelcomeImagePath(entry.heroImage)) {
    paths.push(entry.heroImage)
  }
  for (const path of entry.additionalImages ?? []) {
    if (isRenderableWelcomeImagePath(path)) {
      paths.push(path)
    }
  }
  return paths
}
