import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"
import { resolveFirefoxExtensionUuid } from "../../../tests/e2e/resolve-firefox-extension-uuid.ts"

describe("resolveFirefoxExtensionUuid", () => {
  it("reads gecko.id → UUID from prefs.js", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bmxt-uuid-"))
    const uuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    const map = JSON.stringify({ "bmxt@unrsports": uuid })
    const escaped = map.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
    writeFileSync(
      join(dir, "prefs.js"),
      `user_pref("extensions.webextensions.uuids", "${escaped}");\n`,
      "utf8"
    )
    const resolved = await resolveFirefoxExtensionUuid(dir, "bmxt@unrsports", 2_000)
    assert.equal(resolved, uuid)
  })

  it("reads UUID from extensions.json rootURI", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bmxt-uuid-"))
    const uuid = "11111111-2222-3333-4444-555555555555"
    writeFileSync(
      join(dir, "extensions.json"),
      JSON.stringify({
        addons: [
          {
            id: "bmxt@unrsports",
            rootURI: `moz-extension://${uuid}/`
          }
        ]
      }),
      "utf8"
    )
    const resolved = await resolveFirefoxExtensionUuid(dir, "bmxt@unrsports", 2_000)
    assert.equal(resolved, uuid)
  })
})
