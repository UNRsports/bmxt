import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  listManifestContentScriptInjections,
  listManifestContentScriptMatches
} from "../../../../shared/lib/features/page-scripting/ensure-content-script.ts"

describe("ensure-content-script manifest helpers", () => {
  it("lists js injections from content_scripts", () => {
    const manifest = {
      content_scripts: [
        {
          matches: ["https://*/*"],
          js: ["content-scripts/bmxt-nav-overlay.js"],
          all_frames: false,
          run_at: "document_idle"
        }
      ]
    } as chrome.runtime.Manifest
    const injections = listManifestContentScriptInjections(manifest)
    assert.equal(injections.length, 1)
    assert.deepEqual(injections[0]?.files, ["content-scripts/bmxt-nav-overlay.js"])
    assert.equal(injections[0]?.allFrames, false)
    assert.equal(injections[0]?.injectImmediately, false)
  })

  it("defaults matches when content_scripts omit them", () => {
    const matches = listManifestContentScriptMatches({} as chrome.runtime.Manifest)
    assert.deepEqual(matches, ["https://*/*"])
  })

  it("collects unique match patterns", () => {
    const manifest = {
      content_scripts: [
        { matches: ["https://*/*"], js: ["a.js"] },
        { matches: ["https://*/*", "https://example.com/*"], js: ["b.js"] }
      ]
    } as chrome.runtime.Manifest
    const matches = listManifestContentScriptMatches(manifest)
    assert.deepEqual(matches, ["https://*/*", "https://example.com/*"])
  })
})
