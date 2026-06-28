import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { tokenizeDomHtmlSnippet } from "./dom-html-tokenize.ts"

function texts(kind: string, tokens: ReturnType<typeof tokenizeDomHtmlSnippet>): string[] {
  return tokens.filter((t) => t.kind === kind).map((t) => t.text)
}

describe("tokenizeDomHtmlSnippet", () => {
  it("separates markup from visible text content", () => {
    const tokens = tokenizeDomHtmlSnippet('<a href="/repo">UNRsports/bmxt</a>')
    assert.deepEqual(texts("text", tokens), ["UNRsports/bmxt"])
    assert.ok(texts("tag", tokens).includes("a"))
    assert.ok(texts("attrName", tokens).includes("href"))
    assert.ok(texts("attrValue", tokens).includes("/repo"))
  })

  it("tokenizes quoted and unquoted attribute values", () => {
    const tokens = tokenizeDomHtmlSnippet("<input type=text class=\"x y\">")
    assert.ok(texts("attrValue", tokens).includes("text"))
    assert.ok(texts("attrValue", tokens).includes("x y"))
  })

  it("tokenizes HTML comments", () => {
    const tokens = tokenizeDomHtmlSnippet("<!-- skip --><span>ok</span>")
    assert.equal(tokens[0]?.kind, "comment")
    assert.equal(tokens[0]?.text, "<!-- skip -->")
    assert.deepEqual(texts("text", tokens), ["ok"])
  })

  it("handles truncated snippets at end of tag", () => {
    const tokens = tokenizeDomHtmlSnippet('<a href="https://github.com/UNRsports/bmxt"')
    assert.ok(texts("tag", tokens).includes("a"))
    assert.ok(texts("attrName", tokens).includes("href"))
    assert.ok(
      texts("attrValue", tokens).some((v) => v.includes("github.com"))
    )
  })

  it("returns plain text when no markup is present", () => {
    const tokens = tokenizeDomHtmlSnippet("plain label")
    assert.deepEqual(tokens, [{ kind: "text", text: "plain label" }])
  })
})
