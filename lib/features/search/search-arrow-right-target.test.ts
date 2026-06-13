import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { resolveSearchArrowRightTarget } from "./search-arrow-right-target.ts"

describe("resolveSearchArrowRightTarget", () => {
  it("routes closed-tab history rows to destination even with detail hits", () => {
    assert.equal(
      resolveSearchArrowRightTarget({
        tabOpen: false,
        offersDestination: true,
        hasDetailHits: true,
        fromDetailView: false
      }),
      "destination"
    )
  })

  it("routes open-tab rows with detail hits to detail from results", () => {
    assert.equal(
      resolveSearchArrowRightTarget({
        tabOpen: true,
        offersDestination: true,
        hasDetailHits: true,
        fromDetailView: false
      }),
      "detail"
    )
  })

  it("does not open detail from results when the tab is closed", () => {
    assert.equal(
      resolveSearchArrowRightTarget({
        tabOpen: false,
        offersDestination: false,
        hasDetailHits: true,
        fromDetailView: false
      }),
      "none"
    )
  })

  it("does not open destination for bookmark-only rows when tab is closed", () => {
    assert.equal(
      resolveSearchArrowRightTarget({
        tabOpen: false,
        offersDestination: false,
        hasDetailHits: false,
        fromDetailView: false
      }),
      "none"
    )
  })

  it("does nothing on detail view when the tab is open", () => {
    assert.equal(
      resolveSearchArrowRightTarget({
        tabOpen: true,
        offersDestination: true,
        hasDetailHits: true,
        fromDetailView: true
      }),
      "none"
    )
  })

  it("routes detail view to destination when the tab closed after drill-down", () => {
    assert.equal(
      resolveSearchArrowRightTarget({
        tabOpen: false,
        offersDestination: true,
        hasDetailHits: true,
        fromDetailView: true
      }),
      "destination"
    )
  })
})
