import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DOM_CLEAR_HIGHLIGHT_CHANNEL,
  DOM_SCROLL_TO_PATH_CHANNEL,
  DOM_SEMANTIC_ENTRIES_CHANNEL,
  isDomClearHighlightRequest,
  isDomScrollToPathRequest,
  isDomSemanticEntriesRequest
} from "./dom-list-in-page-message.ts"

describe("dom-list-in-page-message", () => {
  it("accepts semantic entries requests", () => {
    assert.equal(
      isDomSemanticEntriesRequest({
        channel: DOM_SEMANTIC_ENTRIES_CHANNEL,
        mode: "html",
        kind: "link"
      }),
      true
    )
    assert.equal(
      isDomSemanticEntriesRequest({
        channel: DOM_SEMANTIC_ENTRIES_CHANNEL,
        mode: "react",
        kind: "heading"
      }),
      true
    )
    assert.equal(
      isDomSemanticEntriesRequest({
        channel: DOM_SEMANTIC_ENTRIES_CHANNEL,
        mode: "html",
        kind: "link",
        scope: "viewport",
        showTag: true,
        emptyImageAltLabel: "altなし"
      }),
      true
    )
    assert.equal(
      isDomSemanticEntriesRequest({
        channel: DOM_SEMANTIC_ENTRIES_CHANNEL,
        mode: "html",
        kind: "link",
        showTag: "yes"
      }),
      false
    )
    assert.equal(
      isDomSemanticEntriesRequest({
        channel: DOM_SEMANTIC_ENTRIES_CHANNEL,
        mode: "html",
        kind: "link",
        scope: "invalid"
      }),
      false
    )
    assert.equal(
      isDomSemanticEntriesRequest({
        channel: DOM_SEMANTIC_ENTRIES_CHANNEL,
        mode: "html",
        kind: "unknown"
      }),
      false
    )
  })

  it("accepts scroll-to-path requests with integer paths", () => {
    assert.equal(
      isDomScrollToPathRequest({
        channel: DOM_SCROLL_TO_PATH_CHANNEL,
        path: [0, 2, -1, 1],
        persist: true
      }),
      true
    )
    assert.equal(
      isDomScrollToPathRequest({
        channel: DOM_SCROLL_TO_PATH_CHANNEL,
        path: [0, 1.5]
      }),
      false
    )
  })

  it("accepts clear-highlight requests", () => {
    assert.equal(
      isDomClearHighlightRequest({ channel: DOM_CLEAR_HIGHLIGHT_CHANNEL }),
      true
    )
    assert.equal(isDomClearHighlightRequest({ channel: "other" }), false)
  })
})
