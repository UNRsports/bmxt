import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildGoogleSheetsCellUrl,
  isGoogleSheetsUrl,
  parseGoogleSheetsUrl
} from "../../../../shared/lib/features/url/parse-google-sheets-url.ts"

describe("parseGoogleSheetsUrl", () => {
  it("parses edit URL with gid in hash", () => {
    const parts = parseGoogleSheetsUrl(
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=123"
    )
    assert.deepEqual(parts, {
      spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      gid: "123"
    })
  })

  it("parses /u/0/d/ paths and query gid", () => {
    const parts = parseGoogleSheetsUrl(
      "https://docs.google.com/spreadsheets/u/0/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?gid=9"
    )
    assert.equal(parts?.gid, "9")
    assert.equal(isGoogleSheetsUrl(parts ? `https://docs.google.com/spreadsheets/d/${parts.spreadsheetId}/edit` : ""), true)
  })

  it("defaults gid to 0", () => {
    const parts = parseGoogleSheetsUrl(
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
    )
    assert.equal(parts?.gid, "0")
  })

  it("rejects non-sheets hosts", () => {
    assert.equal(parseGoogleSheetsUrl("https://example.com/spreadsheets/d/abc1234567/edit"), null)
    assert.equal(isGoogleSheetsUrl("https://docs.google.com/document/d/abc1234567/edit"), false)
  })
})

describe("buildGoogleSheetsCellUrl", () => {
  it("builds gid + range deep link", () => {
    const href = buildGoogleSheetsCellUrl(
      { spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", gid: "42" },
      "b12"
    )
    assert.ok(href)
    const u = new URL(href!)
    assert.equal(u.searchParams.get("gid"), "42")
    assert.equal(u.hash, "#gid=42&range=B12")
  })

  it("rejects invalid cell refs", () => {
    assert.equal(
      buildGoogleSheetsCellUrl(
        { spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", gid: "0" },
        "12B"
      ),
      null
    )
  })
})
