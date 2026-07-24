import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  domListLineHasFlavor,
  parseDomListArgsFromTokens,
  parseDomListCommandLine
} from "./parse-dom-list-args.ts"

describe("parseDomListArgsFromTokens", () => {
  it("defaults to normal mode and requires flavor", () => {
    assert.deepEqual(parseDomListArgsFromTokens(["--html"]), {
      pickerMode: "normal",
      flavor: "--html",
      showTag: false,
      pattern: ""
    })
    assert.equal(parseDomListArgsFromTokens(["--normal"]), null)
  })

  it("parses with mode and react flavor", () => {
    assert.deepEqual(parseDomListArgsFromTokens(["--with", "--react", "foo"]), {
      pickerMode: "with",
      flavor: "--react",
      showTag: false,
      pattern: "foo"
    })
  })

  it("accepts tokens in any order", () => {
    assert.deepEqual(parseDomListArgsFromTokens(["--html", "--with"]), {
      pickerMode: "with",
      flavor: "--html",
      showTag: false,
      pattern: ""
    })
  })

  it("parses --tag only for --with mode", () => {
    assert.deepEqual(parseDomListArgsFromTokens(["--with", "--html", "--tag"]), {
      pickerMode: "with",
      flavor: "--html",
      showTag: true,
      pattern: ""
    })
    assert.deepEqual(parseDomListArgsFromTokens(["--normal", "--html", "--tag"]), {
      pickerMode: "normal",
      flavor: "--html",
      showTag: false,
      pattern: ""
    })
  })

  it("rejects unknown option tokens such as --picker", () => {
    assert.equal(parseDomListArgsFromTokens(["--with", "--html", "--picker"]), null)
  })
})

describe("parseDomListCommandLine", () => {
  it("parses full command lines", () => {
    assert.deepEqual(parseDomListCommandLine("dom -list --with --html"), {
      pickerMode: "with",
      flavor: "--html",
      showTag: false,
      pattern: ""
    })
  })

  it("reports flavor presence", () => {
    assert.equal(domListLineHasFlavor("dom -list --html"), true)
    assert.equal(domListLineHasFlavor("dom -list --with"), false)
  })
})
