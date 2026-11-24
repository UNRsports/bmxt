import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildCloseGroupCommandLine,
  buildCloseWindowsCommandLine,
  buildGroupNewCommandLine,
  buildGroupRenameCommandLine,
  buildGroupUngroupCommandLine,
  buildOpenIntoWindowCommandLine,
  buildTabActivateCommandLine,
  buildTabCloseCommandLine,
  buildTabReloadCommandLine,
  buildWindowRenameCommandLine
} from "../../../../shared/lib/features/picker/build-picker-command-line.ts"

describe("build-picker-command-line tab/window/group wizard lines", () => {
  it("builds close / reload pipe lines", () => {
    assert.equal(buildTabCloseCommandLine([1, 2]), "#t:1 #t:2 | close")
    assert.equal(buildTabReloadCommandLine([9]), "#t:9 | reload")
    assert.equal(buildTabCloseCommandLine([]), null)
  })

  it("builds open --into-window only for http(s) URLs", () => {
    assert.equal(
      buildOpenIntoWindowCommandLine(3, "https://example.com/a"),
      "open --into-window 3 https://example.com/a"
    )
    assert.equal(buildOpenIntoWindowCommandLine(3, ""), null)
    assert.equal(buildOpenIntoWindowCommandLine(3, "ftp://x"), null)
  })

  it("builds activate / close window / close group", () => {
    assert.equal(buildTabActivateCommandLine(42), "tab -activate 42")
    assert.equal(buildCloseWindowsCommandLine([4, 5]), "close --window 4 5")
    assert.equal(buildCloseGroupCommandLine(7), "close --group 7")
  })

  it("builds group rename / ungroup / new with flags", () => {
    assert.equal(buildGroupRenameCommandLine(2, "Work"), "group rename 2 Work")
    assert.equal(buildGroupUngroupCommandLine(2), "group ungroup 2")
    assert.equal(
      buildGroupNewCommandLine([1, 2], { title: "Work", color: "blue" }),
      "group new 1 2 --title Work --color blue"
    )
  })

  it("builds window rename", () => {
    assert.equal(buildWindowRenameCommandLine(8, "Main"), "window rename 8 Main")
  })
})
