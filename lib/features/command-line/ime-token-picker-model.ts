/** EN: Shared IME token picker model (avoids circular imports with resolvers). */

import type { CandidateMatchMode } from "./ime-token-match"

export type ImeTokenTier = "first" | "second" | "third"

export type ResolveImeTokenPickerOptions = {
  emptyFirstPrefixShowsAll?: boolean
  candidateMatch?: CandidateMatchMode
}

export type ImeTokenPickerModel = {
  tokenStart: number
  tokenEnd: number
  prefix: string
  candidates: string[]
  tier: ImeTokenTier
}
