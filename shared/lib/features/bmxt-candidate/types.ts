/** EN: Canonical prompt candidate menu schema (bmxtCandidate). */

export const BMXT_CANDIDATE_SCHEMA = "bmxt-candidate/1" as const

export type BmxtCandidateTier = "first" | "second" | "third" | "rest"

export type BmxtCandidateMatchMode = "prefix" | "contains"

export type BmxtCandidateListOperator = "&&" | "||" | ";"

export type BmxtCandidateSegmentContext = {
  id: string
  description?: string
  when: {
    cursorInEmptyTailSegment?: boolean
    precededByOperator?: readonly BmxtCandidateListOperator[]
    cursorInPipeStage?: boolean
    pipeStageIndex?: number
    pipeStageIndexMin?: number
    tokenIndex?: number
  }
  resetToTier?: BmxtCandidateTier
  candidateSource?: string
  followCommandZones?: boolean
  openOnTab?: boolean
  openOnEmptyPrefixWhenMenuEligible?: boolean
}

export type BmxtCandidateDataSource = {
  id: string
  domain: "browser" | "ui"
  description: string
  valueKind: "url" | "string" | "integer" | "commandLine"
  chromeApis?: readonly string[]
  filterDefault: BmxtCandidateMatchMode
  implementation?: string
}

export type BmxtCandidateZoneSource =
  | {
      kind: "manifest.static"
      from?: string
      tokens?: readonly string[]
    }
  | {
      kind: "runtime.dynamic"
      provider: string
      labelFields?: readonly string[]
    }
  | {
      kind: "plugin.feature"
      provider: string
    }

export type BmxtCandidateCommandZone = {
  tier: BmxtCandidateTier
  tokenIndexMin?: number
  when?: Record<string, string>
  sources: readonly BmxtCandidateZoneSource[]
  suppressWhen?: readonly string[]
  ui?: "inline_token" | "inline_entity" | "tab_cycle_or_inline_token"
  tierRemap?: Partial<Record<BmxtCandidateTier, BmxtCandidateTier>>
}

export type BmxtCandidateCommandEntry = {
  command: string
  zones: readonly BmxtCandidateCommandZone[]
}

export type BmxtCandidateCatalog = {
  schemaVersion: number
  profileSchema: typeof BMXT_CANDIDATE_SCHEMA
  description?: string
  profile: {
    tierNames: readonly BmxtCandidateTier[]
    filter: {
      menuClosed: BmxtCandidateMatchMode
      menuOpen: BmxtCandidateMatchMode
      optionTokenBodyMatch: boolean
      substringMinLength: number
    }
    openTriggers: readonly string[]
    closeTriggers: readonly string[]
    selection: {
      keys: readonly string[]
      appendTrailingSpaceAtEol: boolean
      resyncNextTierAfterPick: boolean
    }
    ui: {
      panelKind: string
      role: string
      hintNamespace: string
    }
    segmentContexts: readonly BmxtCandidateSegmentContext[]
    manifestCodegenRef?: string
    notes?: readonly string[]
  }
  dataSources: readonly BmxtCandidateDataSource[]
  registrySources: readonly { id: string; description: string }[]
  commands: readonly BmxtCandidateCommandEntry[]
}
