import raw from "./release-notes.json"

export type ReleaseNotesEntry = {
  ja: string
  en: string
}

type ReleaseNotesText = string | string[]
type ReleaseNotesRawEntry = {
  ja: ReleaseNotesText
  en: ReleaseNotesText
}
type NotesMap = Record<string, ReleaseNotesRawEntry>

const MAP = raw as NotesMap

const PLACEHOLDER_JA =
  "（このバージョンのリリースノートは未登録です。lib/features/release-notes/release-notes.json にエントリを追加してください。）"
const PLACEHOLDER_EN =
  "(No release notes for this version. Add an entry to lib/features/release-notes/release-notes.json.)"

export function getReleaseNotesForVersion(version: string): ReleaseNotesEntry | null {
  const e = MAP[version]
  if (!e) {
    return null
  }
  return {
    ja: normalizeText(e.ja),
    en: normalizeText(e.en)
  }
}

export function placeholderTexts(): ReleaseNotesEntry {
  return { ja: PLACEHOLDER_JA, en: PLACEHOLDER_EN }
}

function compareSemverKeys(a: string, b: string): number {
  const pa = a.split(".").map((s) => parseInt(s, 10) || 0)
  const pb = b.split(".").map((s) => parseInt(s, 10) || 0)
  const n = Math.max(pa.length, pb.length)
  for (let i = 0; i < n; i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da !== db) {
      return da - db
    }
  }
  return a.localeCompare(b)
}

export function listRegisteredVersions(): string[] {
  return Object.keys(MAP).sort(compareSemverKeys)
}

export function getRawMap(): Readonly<NotesMap> {
  return MAP
}

function normalizeText(text: ReleaseNotesText): string {
  return Array.isArray(text) ? text.join("\n") : text
}
