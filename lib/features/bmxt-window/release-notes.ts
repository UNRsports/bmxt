import raw from "./release-notes.json"

export type ReleaseNotesEntry = {
  ja: string
  en: string
}

type NotesMap = Record<string, ReleaseNotesEntry>

const MAP = raw as NotesMap

export function getReleaseNotesForVersion(version: string): ReleaseNotesEntry | null {
  const e = MAP[version]
  return e ?? null
}
