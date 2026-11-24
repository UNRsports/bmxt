import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { effectiveCommandLocale } from "../../../../shared/lib/features/setting/effective-command-locale.ts"
import type { UiSettings } from "../../../../shared/lib/features/setting/settings.ts"
import type { SettingListPickerState } from "../../../../shared/lib/features/setting/setting-list-picker-state.ts"

const baseSettings: UiSettings = {
  locale: "ja",
  hostUiMode: "auto",
  imeCandidateHelp: true,
  promptFire: false,
  searchLegendMode: "text",
  appearance: {} as UiSettings["appearance"]
}

describe("effectiveCommandLocale", () => {
  it("uses committed settings when setting picker is closed", () => {
    assert.equal(effectiveCommandLocale({ ...baseSettings, locale: "en" }, null), "en")
  })

  it("prefers open picker mirror locale (stays synced after immediate commit)", () => {
    const picker: SettingListPickerState = {
      draft: {
        locale: "en",
        hostUiMode: "auto",
        imeCandidateHelp: true,
        promptFire: false,
        searchLegendMode: "text",
        appearance: baseSettings.appearance
      },
      view: "main",
      editing: false,
      editDraft: ""
    }
    assert.equal(effectiveCommandLocale(baseSettings, picker), "en")
  })
})
