import { loadBmxtCandidateCatalog } from "./load-catalog.ts"

/** EN: Known runtime data source ids from manifest/bmxt-candidate.json. */
export function listBmxtCandidateDataSourceIds(): readonly string[] {
  return loadBmxtCandidateCatalog().dataSources.map((source) => source.id)
}

export function getBmxtCandidateDataSource(id: string) {
  return loadBmxtCandidateCatalog().dataSources.find((source) => source.id === id) ?? null
}

/** EN: Command zone entries for a canonical first command. */
export function getBmxtCandidateZonesForCommand(command: string) {
  const entry = loadBmxtCandidateCatalog().commands.find((row) => row.command === command)
  return entry?.zones ?? []
}

/** EN: Segment context rules (compound / pipe) from the profile. */
export function listBmxtCandidateSegmentContexts() {
  return loadBmxtCandidateCatalog().profile.segmentContexts
}
