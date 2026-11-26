import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { resolveSettingSetImeOverlay } from "../../../../shared/lib/features/setting/setting-set-ime-overlay.ts"
import { SETTING_SET_KEY_TOKENS } from "../../../../shared/lib/features/setting/setting-set-args.ts"

describe("setting -set IME live overlay", () => {
  it("offers closed keys after setting -set ", () => {
    const line = "setting -set "
    const model = resolveSettingSetImeOverlay(line, line.length)
    assert.ok(model)
    assert.equal(model?.tier, "third")
    assert.deepEqual(model?.candidates, [...SETTING_SET_KEY_TOKENS])
  })

  it("prefix-filters key candidates while typing", () => {
    const line = "setting -set pro"
    const model = resolveSettingSetImeOverlay(line, line.length)
    assert.deepEqual(model?.candidates, ["prompt-fire"])
  })

  it("offers discrete values after setting -set locale ", () => {
    const line = "setting -set locale "
    const model = resolveSettingSetImeOverlay(line, line.length)
    assert.deepEqual(model?.candidates, ["ja", "en"])
  })

  it("offers on/off after setting -set prompt-fire ", () => {
    const line = "setting -set prompt-fire "
    const model = resolveSettingSetImeOverlay(line, line.length)
    assert.deepEqual(model?.candidates, ["on", "off"])
  })

  it("offers clear tokens for free-form appearance keys", () => {
    const line = "setting -set fg "
    const model = resolveSettingSetImeOverlay(line, line.length)
    assert.deepEqual(model?.candidates, ["default", "reset"])
  })

  it("ignores unrelated commands", () => {
    const line = "tab -set "
    const model = resolveSettingSetImeOverlay(line, line.length)
    assert.equal(model, null)
  })
})
