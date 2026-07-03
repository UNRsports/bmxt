import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { effectiveCommandLocale } from "./effective-command-locale.ts"
import type { UiSettings } from "./settings.ts"
import type { SettingListPickerState } from "./setting-list-picker-state.ts"

const baseSettings: UiSettings = {
  locale: "ja",
  appearance: {} as UiSettings["appearance"]
}

describe("effectiveCommandLocale", () => {
  it("uses committed settings when setting picker is closed", () => {
    assert.equal(effectiveCommandLocale({ ...baseSettings, locale: "en" }, null), "en")
  })

  it("prefers setting picker draft locale", () => {
    const picker = {
      draft: { locale: "en", appearance: baseSettings.appearance },
      view: "main",
      editing: null,
      editDraft: ""
    } as SettingListPickerState
    assert.equal(effectiveCommandLocale(baseSettings, picker), "en")
  })
})
