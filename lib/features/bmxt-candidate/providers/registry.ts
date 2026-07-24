/**
 * EN: Runtime provider stubs for catalog dataSources (Chrome/UI live candidates).
 * Fixed-token tiers 1–3 are owned by WASM `complete` — not this registry.
 * JA: catalog の dataSources 用 provider 差し込み口。固定トークン 1–3 段は WASM `complete` が正本。
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

/**
 * EN: Optional live providers keyed by dataSources[].id.
 * Catalog (`manifest/bmxt-candidate.json`) remains a design/validate spec; it is not the
 * fixed-token runtime engine (that is WASM `complete` + `resolveImeTokenPicker` host overlays).
 */
export const BMXT_CANDIDATE_PROVIDERS: Partial<Record<string, BmxtCandidateProvider>> = {}
