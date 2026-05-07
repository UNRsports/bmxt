import {
  getReleaseNotesForVersion,
  listRegisteredVersions,
  placeholderTexts
} from "./release-notes"

/** ターミナルログ用：現在のマニフェストバージョンのノート（ja / en）。 */
export function linesForCurrentVersion(manifestVersion: string): string[] {
  const entry = getReleaseNotesForVersion(manifestVersion)
  const text = entry ?? placeholderTexts()
  const out: string[] = [`Release notes — ${manifestVersion}`, ""]
  out.push("[ja]")
  out.push(text.ja)
  out.push("")
  out.push("[en]")
  out.push(text.en)
  return out
}

/** 指定バージョンキーのノート。未登録時はプレースホルダ。 */
export function linesForVersionKey(version: string): string[] {
  const entry = getReleaseNotesForVersion(version)
  const text = entry ?? placeholderTexts()
  const out: string[] = [`Release notes — ${version}`, ""]
  out.push("[ja]")
  out.push(text.ja)
  out.push("")
  out.push("[en]")
  out.push(text.en)
  return out
}

/** 登録済みバージョンキー一覧（セマンティック風ソート）。 */
export function linesVersionList(): string[] {
  const keys = listRegisteredVersions()
  if (keys.length === 0) {
    return ["(no release note entries in release-notes.json)"]
  }
  const lines = ["Registered release-note versions:", ...keys.map((k) => `  ${k}`)]
  return lines
}
