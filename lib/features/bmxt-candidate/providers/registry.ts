/**
 * EN: Runtime provider stubs — implementations wire Chrome/UI APIs per manifest/bmxt-candidate.json.
 * JA: ランタイム provider の差し込み口（規格 catalog の implementation パスに対応）。
 */

export type BmxtCandidateProviderContext = {
  prefix: string
  filterMode: "prefix" | "contains"
}

export type BmxtCandidateProviderResult = {
  values: readonly string[]
  labels?: Readonly<Record<string, string>>
}

export type BmxtCandidateProvider = (
  ctx: BmxtCandidateProviderContext
) => Promise<BmxtCandidateProviderResult> | BmxtCandidateProviderResult

/** EN: Provider registry keyed by dataSources[].id (filled as adapters land). */
export const BMXT_CANDIDATE_PROVIDERS: Partial<Record<string, BmxtCandidateProvider>> = {}
