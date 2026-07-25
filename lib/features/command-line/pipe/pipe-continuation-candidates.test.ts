import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  applyPipeContinuationCandidates,
  buildPipeContinuationPickLine,
  candidatesIncludePipeContinuation,
  isPipeContinuationCandidate,
  isPipeContinuationOfferZone,
  listPipeContinuationCandidateTokens,
  matchPipeContinuationCandidates,
  mergeOptionAndPipeContinuationCandidates,
  stageLineOffersPipeContinuations
} from "./pipe-continuation-candidates.ts"
import { PIPE_CONSUMER_COMPLETION_IDS } from "./consumers/completion-tokens.ts"

describe("listPipeContinuationCandidateTokens", () => {
  it("prefixes each consumer token with '| '", () => {
    const tokens = listPipeContinuationCandidateTokens()
    for (const id of PIPE_CONSUMER_COMPLETION_IDS) {
      assert.ok(tokens.includes(`| ${id}`), `missing | ${id}`)
    }
    assert.ok(tokens.includes("| c"))
  })
})

describe("isPipeContinuationOfferZone / stageLineOffersPipeContinuations", () => {
  it("accepts tab -list with optional trailing options", () => {
    assert.equal(stageLineOffersPipeContinuations("tab -list"), true)
    assert.equal(stageLineOffersPipeContinuations("tab -list "), true)
    assert.equal(stageLineOffersPipeContinuations("tab -list -url"), true)
  })

  it("rejects incomplete or non-producer stages", () => {
    assert.equal(stageLineOffersPipeContinuations("tab"), false)
    assert.equal(stageLineOffersPipeContinuations("tab -nowurl"), false)
    assert.equal(stageLineOffersPipeContinuations("help -list"), false)
  })

  it("offers at EOL on complete -list without trailing space", () => {
    const line = "setting -list"
    assert.equal(isPipeContinuationOfferZone(line, line.length), true)
  })
})

describe("matchPipeContinuationCandidates", () => {
  const all = listPipeContinuationCandidateTokens()

  it("returns all on empty prefix", () => {
    assert.deepEqual(matchPipeContinuationCandidates(all, "", "prefix"), all)
  })

  it("filters by '| ' prefix", () => {
    const filtered = matchPipeContinuationCandidates(all, "|", "prefix")
    assert.ok(filtered.every((t) => t.startsWith("| ")))
    assert.ok(filtered.includes("| browse"))
  })

  it("returns none while typing dash options", () => {
    assert.deepEqual(matchPipeContinuationCandidates(all, "-", "prefix"), [])
    assert.deepEqual(matchPipeContinuationCandidates(all, "-u", "prefix"), [])
  })
})

describe("mergeOptionAndPipeContinuationCandidates", () => {
  it("keeps options first then pipe continuations", () => {
    const merged = mergeOptionAndPipeContinuationCandidates(["-url"], "", "prefix")
    assert.equal(merged[0], "-url")
    assert.ok(merged.includes("| browse"))
  })
})

describe("applyPipeContinuationCandidates", () => {
  it("merges | browse into tab -list third-tier options", () => {
    const line = "tab -list "
    const hit = applyPipeContinuationCandidates(
      {
        tokenStart: line.length,
        tokenEnd: line.length,
        prefix: "",
        candidates: ["-url"],
        tier: "third"
      },
      line,
      line.length
    )
    assert.ok(hit)
    assert.ok(hit!.candidates.includes("-url"))
    assert.ok(hit!.candidates.includes("| browse"))
  })

  it("synthesizes pipe-only menu when setting -list has no options", () => {
    const line = "setting -list "
    const hit = applyPipeContinuationCandidates(null, line, line.length)
    assert.ok(hit)
    assert.equal(hit!.tier, "third")
    assert.ok(hit!.candidates.includes("| browse"))
    assert.ok(hit!.candidates.includes("| close"))
  })

  it("offers pipe continuations for setting -list at EOL without trailing space", () => {
    const line = "setting -list"
    const hit = applyPipeContinuationCandidates(null, line, line.length)
    assert.ok(hit)
    assert.equal(hit!.tier, "third")
    assert.equal(hit!.tokenStart, line.length)
    assert.equal(hit!.tokenEnd, line.length)
    assert.ok(hit!.candidates.includes("| browse"))
  })

  it("replaces stale second-tier -list menu with pipe continuations at EOL", () => {
    const line = "setting -list"
    const hit = applyPipeContinuationCandidates(
      {
        tokenStart: "setting ".length,
        tokenEnd: line.length,
        prefix: "-list",
        candidates: ["-list", "-exit"],
        tier: "second"
      },
      line,
      line.length
    )
    assert.ok(hit)
    assert.equal(hit!.tier, "third")
    assert.ok(hit!.candidates.includes("| browse"))
    assert.ok(!hit!.candidates.includes("-list"))
  })

  it("narrows to pipe continuations when prefix is |", () => {
    const line = "tab -list |"
    const hit = applyPipeContinuationCandidates(
      {
        tokenStart: line.length - 1,
        tokenEnd: line.length,
        prefix: "|",
        candidates: [],
        tier: "third"
      },
      line,
      line.length
    )
    assert.ok(hit)
    assert.ok(hit!.candidates.every((c) => c.startsWith("| ")))
    assert.ok(hit!.candidates.includes("| browse"))
    assert.ok(!hit!.candidates.includes("-url"))
  })
})

describe("buildPipeContinuationPickLine", () => {
  it("appends ' | browse' after tab -list ", () => {
    const line = "tab -list "
    assert.deepEqual(
      buildPipeContinuationPickLine(line, line.length, line.length, "| browse"),
      {
        line: "tab -list | browse",
        cursor: "tab -list | browse".length
      }
    )
  })

  it("replaces a typed '|' token", () => {
    const line = "tab -list |"
    const start = line.length - 1
    assert.deepEqual(buildPipeContinuationPickLine(line, start, line.length, "| browse"), {
      line: "tab -list | browse",
      cursor: "tab -list | browse".length
    })
  })
})

describe("isPipeContinuationCandidate", () => {
  it("detects '| browse' shape", () => {
    assert.equal(isPipeContinuationCandidate("| browse"), true)
    assert.equal(isPipeContinuationCandidate("-url"), false)
    assert.equal(isPipeContinuationCandidate("browse"), false)
  })

  it("candidatesIncludePipeContinuation scans the list", () => {
    assert.equal(candidatesIncludePipeContinuation(["-url", "| browse"]), true)
    assert.equal(candidatesIncludePipeContinuation(["-url"]), false)
  })
})
