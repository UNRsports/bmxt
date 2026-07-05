import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  BMXT_CANDIDATE_SCHEMA,
  loadBmxtCandidateCatalog,
  listBmxtCandidateDataSourceIds,
  listBmxtCandidateSegmentContexts,
  validateBmxtCandidateCatalog,
  validateBundledBmxtCandidateCatalog
} from "./index.ts"

describe("bmxtCandidate catalog", () => {
  it("loads manifest with expected schema id", () => {
    const catalog = loadBmxtCandidateCatalog()
    assert.equal(catalog.profileSchema, BMXT_CANDIDATE_SCHEMA)
    assert.equal(catalog.schemaVersion, 1)
  })

  it("validates bundled manifest shape and provider references", () => {
    const catalog = loadBmxtCandidateCatalog()
    assert.equal(validateBmxtCandidateCatalog(catalog), true)
    const issues = validateBundledBmxtCandidateCatalog()
    assert.deepEqual(issues, [])
  })

  it("declares compound and pipe segment contexts", () => {
    const contexts = listBmxtCandidateSegmentContexts()
    const ids = new Set(contexts.map((ctx) => ctx.id))
    assert.equal(ids.has("compound.afterListOperator"), true)
    assert.equal(ids.has("pipe.afterPipeOperator"), true)
    const compound = contexts.find((ctx) => ctx.id === "compound.afterListOperator")
    assert.deepEqual(compound?.when.precededByOperator, ["&&", "||", ";"])
  })

  it("registers browser and ui runtime data sources", () => {
    const ids = listBmxtCandidateDataSourceIds()
    assert.ok(ids.includes("browser.openTabUrls"))
    assert.ok(ids.includes("browser.tabGroupLabels"))
    assert.ok(ids.includes("browser.historyUrls"))
    assert.ok(ids.includes("ui.commandHistory"))
    assert.ok(ids.includes("ui.sessionNames"))
  })

  it("binds close and tabs -moveurl to tab/history sources", () => {
    const catalog = loadBmxtCandidateCatalog()
    const close = catalog.commands.find((c) => c.command === "close")
    const closeProviders =
      close?.zones.flatMap((zone) =>
        zone.sources.flatMap((source) => (source.kind === "runtime.dynamic" ? [source.provider] : []))
      ) ?? []
    assert.ok(closeProviders.includes("browser.tabIds"))

    const tabs = catalog.commands.find((c) => c.command === "tabs")
    const moveUrlZone = tabs?.zones.find((zone) => zone.when?.second === "-moveurl")
    const moveUrlProviders =
      moveUrlZone?.sources.flatMap((source) =>
        source.kind === "runtime.dynamic" ? [source.provider] : []
      ) ?? []
    assert.ok(moveUrlProviders.includes("browser.openTabUrls"))
    assert.ok(moveUrlProviders.includes("browser.historyUrls"))
  })
})
