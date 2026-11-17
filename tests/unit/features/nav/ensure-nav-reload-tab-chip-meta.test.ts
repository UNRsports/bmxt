import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import {
  fillNavReloadTabChipMetaFromLiveFields,
  ensureNavReloadTabChipMetaForTexts
} from "../../../../shared/lib/features/nav/ensure-nav-reload-tab-chip-meta.ts"
import type { NavReloadTabChipMeta } from "../../../../shared/lib/features/nav/nav-reload-tab-token.ts"
import { rewriteHashTTokensForLog } from "../../../../shared/lib/features/nav/nav-tab-ref-log-rewrite.ts"
import { parseTabRefLogSegments } from "../../../../shared/lib/features/command-line/tab-ref-log.ts"
import {
  clearTabPickerLiveFields,
  seedTabPickerLiveFields
} from "../../../../shared/lib/features/tabs/tab-picker-live-tab-fields.ts"

describe("ensureNavReloadTabChipMeta", () => {
  afterEach(() => {
    clearTabPickerLiveFields()
  })

  it("fills chip meta from picker live fields so Family-send logs show real titles", () => {
    seedTabPickerLiveFields(11, "Welcome to BMXt", "https://example.test/welcome", null)
    seedTabPickerLiveFields(22, "GitHub", "https://github.com/x", "https://fav.example/g")
    const meta = new Map<number, NavReloadTabChipMeta>()
    const missing = fillNavReloadTabChipMetaFromLiveFields([11, 22, 33], meta)
    assert.deepEqual(missing, [33])
    assert.equal(meta.get(11)?.title, "Welcome to BMXt")
    assert.equal(meta.get(22)?.title, "GitHub")
    assert.equal(meta.get(22)?.url, "https://github.com/x")

    const out = rewriteHashTTokensForLog(
      "> #t:11 #t:22 | tab -send peerDeviceAbc",
      meta,
      "タブ"
    )
    assert.equal(out.includes("#t:"), false)
    assert.equal(out.includes("タブ"), false)
    const segments = parseTabRefLogSegments(out)
    const titles = segments
      .filter((s) => s.kind === "tabRef")
      .map((s) => (s.kind === "tabRef" ? s.meta.title : ""))
    assert.deepEqual(titles, ["Welcome to BMXt", "GitHub"])
    const urls = segments
      .filter((s) => s.kind === "tabRef")
      .map((s) => (s.kind === "tabRef" ? s.meta.url : null))
    assert.deepEqual(urls, ["https://example.test/welcome", "https://github.com/x"])
  })

  it("falls back to chrome.tabs.get when live fields are absent", async () => {
    const previousChrome = (globalThis as { chrome?: unknown }).chrome
    ;(globalThis as { chrome: unknown }).chrome = {
      runtime: {
        getManifest: () => ({ permissions: [] })
      },
      tabs: {
        get: async (tabId: number) => {
          if (tabId !== 7) {
            throw new Error("missing")
          }
          return {
            id: 7,
            title: "Live Docs",
            url: "https://docs.example/",
            favIconUrl: undefined
          }
        }
      }
    }
    try {
      const meta = new Map<number, NavReloadTabChipMeta>()
      await ensureNavReloadTabChipMetaForTexts(
        ["> #t:7 | tab -send peer1"],
        meta
      )
      assert.equal(meta.get(7)?.title, "Live Docs")
      assert.equal(meta.get(7)?.url, "https://docs.example/")
    } finally {
      if (previousChrome === undefined) {
        delete (globalThis as { chrome?: unknown }).chrome
      } else {
        ;(globalThis as { chrome?: unknown }).chrome = previousChrome
      }
    }
  })
})
