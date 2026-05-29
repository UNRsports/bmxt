/** heroImage に画像なしを明示するときのセンチネル（実ファイルパスではない）。 */
export const WELCOME_NONE_HERO_IMAGE = "_none_heroImage"

export type WelcomeImageFields = {
  heroImage?: string
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
