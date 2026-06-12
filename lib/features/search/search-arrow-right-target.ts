export type SearchArrowRightTarget = "detail" | "destination" | "none"

export type SearchArrowRightTargetInput = {
  tabOpen: boolean
  offersDestination: boolean
  hasDetailHits: boolean
  fromDetailView: boolean
}

/**
 * EN: Where `→` goes from search picker results or detail.
 * JA: 該当タブが開いていなければ開き先へ。開いていれば結果一覧からのみ詳細へ。
 */
export function resolveSearchArrowRightTarget(
  input: SearchArrowRightTargetInput
): SearchArrowRightTarget {
  if (!input.tabOpen && input.offersDestination) {
    return "destination"
  }
  if (!input.fromDetailView && input.tabOpen && input.hasDetailHits) {
    return "detail"
  }
  return "none"
}
