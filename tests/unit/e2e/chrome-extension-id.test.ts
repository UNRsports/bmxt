import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"
import { chromeExtensionIdFromPath } from "webxdriver"

describe("chromeExtensionIdFromPath (via webxdriver)", () => {
  it("returns 32-char a–p id and is stable for the same path", () => {
    const dir = mkdtempSync(join(tmpdir(), "bmxt-extid-"))
    writeFileSync(join(dir, "manifest.json"), "{}", "utf8")
    const a = chromeExtensionIdFromPath(dir)
    const b = chromeExtensionIdFromPath(dir)
    assert.equal(a, b)
    assert.match(a, /^[a-p]{32}$/)
  })
})
