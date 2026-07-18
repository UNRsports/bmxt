import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { ListRecordKind } from "../list-output/types.ts"
import {
  DISPATCH_BUNDLE_CHANNELS,
  LIST_KIND_TO_BMXT_RULE_KIND,
  bmxtRuleKindForSearchHitSource,
  preferredCommandAddPath
} from "./vocabulary.ts"

const ALL_LIST_KINDS: readonly ListRecordKind[] = [
  "tabs.window",
  "tabs.group",
  "tabs.tab",
  "dom.node",
  "dom.notice",
  "search.hit",
  "session.row",
  "setting.field"
]

describe("inter-command vocabulary", () => {
  it("maps every ListRecordKind to a bmxtRule kind id", () => {
    for (const kind of ALL_LIST_KINDS) {
      assert.equal(typeof LIST_KIND_TO_BMXT_RULE_KIND[kind], "string")
      assert.ok(LIST_KIND_TO_BMXT_RULE_KIND[kind].length > 0)
    }
  })

  it("exposes the four DispatchBundle channels", () => {
    assert.deepEqual([...DISPATCH_BUNDLE_CHANNELS], ["lines", "effects", "ui", "msgs"])
  })

  it("resolves search.hit sources to domain rule kinds", () => {
    assert.equal(bmxtRuleKindForSearchHitSource("bookmark"), "bookmark")
    assert.equal(bmxtRuleKindForSearchHitSource("History"), "history")
    assert.equal(bmxtRuleKindForSearchHitSource("snapshot"), "markdown.file")
    assert.equal(bmxtRuleKindForSearchHitSource("page"), "page.open")
    assert.equal(bmxtRuleKindForSearchHitSource("other"), "search.hit")
  })

  it("prefers reuse paths before extending vocabulary", () => {
    assert.equal(
      preferredCommandAddPath({
        needsChromeApi: true,
        needsUiOnly: false,
        producesList: false,
        consumesPipe: false,
        existingEffectCovers: true,
        existingUiActionCovers: false,
        existingListKindsCover: false,
        existingConsumerCovers: false
      }),
      "reuse-effects"
    )
    assert.equal(
      preferredCommandAddPath({
        needsChromeApi: true,
        needsUiOnly: false,
        producesList: false,
        consumesPipe: false,
        existingEffectCovers: false,
        existingUiActionCovers: false,
        existingListKindsCover: false,
        existingConsumerCovers: false
      }),
      "extend-effect"
    )
    assert.equal(
      preferredCommandAddPath({
        needsChromeApi: false,
        needsUiOnly: false,
        producesList: true,
        consumesPipe: false,
        existingEffectCovers: false,
        existingUiActionCovers: false,
        existingListKindsCover: false,
        existingConsumerCovers: false
      }),
      "extend-list-and-rule"
    )
  })
})
