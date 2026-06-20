import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..")
const jsonPath = join(root, "lib/features/welcome/welcome-content.json")

type WelcomeContentEntry = {
  version: string
  en: string[]
  ja: string[]
}

function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number(n))
  const pb = b.split(".").map((n) => Number(n))
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da !== db) {
      return da - db
    }
  }
  return 0
}

describe("welcome-content.json", () => {
  const raw = readFileSync(jsonPath, "utf8")
  const entries = JSON.parse(raw) as WelcomeContentEntry[]

  it("is a non-empty array with version, en, ja on each entry", () => {
    assert.ok(Array.isArray(entries))
    assert.ok(entries.length > 0)
    for (const entry of entries) {
      assert.match(entry.version, /^\d+(\.\d+)*$/)
      assert.ok(Array.isArray(entry.en) && entry.en.length > 0)
      assert.ok(Array.isArray(entry.ja) && entry.ja.length > 0)
    }
  })

  it("lists newer versions before older ones (append new entries at the top)", () => {
    for (let i = 0; i < entries.length - 1; i++) {
      assert.ok(
        compareVersion(entries[i].version, entries[i + 1].version) >= 0,
        `expected ${entries[i].version} >= ${entries[i + 1].version}`
      )
    }
  })
})
