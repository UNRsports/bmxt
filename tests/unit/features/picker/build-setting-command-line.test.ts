import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  buildSettingEditCommandLine,
  buildSettingPickerRowCommandLine
} from "../../../../shared/lib/features/picker/build-setting-command-line.ts"

describe("buildSettingPickerRowCommandLine", () => {
  it("maps scalar choices to setting -set", () => {
    assert.equal(
      buildSettingPickerRowCommandLine("locale-ja", "language", 0),
      "setting -set locale ja"
    )
    assert.equal(
      buildSettingPickerRowCommandLine("prompt-fire-on", "promptFire", 0),
      "setting -set prompt-fire on"
    )
  })

  it("maps size rows only inside font-size views", () => {
    assert.equal(buildSettingPickerRowCommandLine("size", "main", 6), null)
    assert.equal(
      buildSettingPickerRowCommandLine("size", "fontSize", 6),
      "setting -set size 14px"
    )
    assert.equal(
      buildSettingPickerRowCommandLine("size", "pickerFontSize", 6),
      "setting -set picker-size 14px"
    )
  })

  it("maps FSA / zip / bg actions to one-shot commands", () => {
    assert.equal(
      buildSettingPickerRowCommandLine("export", "main", 0),
      "setting -export"
    )
    assert.equal(
      buildSettingPickerRowCommandLine("import", "main", 0),
      "setting -import"
    )
    assert.equal(
      buildSettingPickerRowCommandLine("bg-import", "bgImage", 0),
      "setting -bg-import"
    )
    assert.equal(
      buildSettingPickerRowCommandLine("bg-import", "pickerBgImage", 0),
      "setting -bg-import --picker"
    )
    assert.equal(
      buildSettingPickerRowCommandLine("storage-mode-external", "storageMode", 0),
      "setting -storage external"
    )
    assert.equal(
      buildSettingPickerRowCommandLine("reset-yes", "resetConfirm", 0),
      "setting -reset-default"
    )
  })

  it("leaves navigation rows as null", () => {
    assert.equal(buildSettingPickerRowCommandLine("language", "main", 0), null)
    assert.equal(buildSettingPickerRowCommandLine("storage", "main", 0), null)
  })
})

describe("buildSettingEditCommandLine", () => {
  it("builds setting -set and sync -setname", () => {
    assert.equal(buildSettingEditCommandLine("fg", "#abc"), "setting -set fg #abc")
    assert.equal(
      buildSettingEditCommandLine("sync-display-name", "desk"),
      "sync -setname desk"
    )
  })
})
