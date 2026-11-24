import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildBookmarkMoveCommandLine,
  buildBookmarkOpenCommandLine,
  buildBookmarkRemoveCommandLine,
  buildBookmarkSendCommandLine,
  buildCloseGroupCommandLine,
  buildCloseWindowsCommandLine,
  buildGroupNewCommandLine,
  buildGroupRenameCommandLine,
  buildGroupUngroupCommandLine,
  buildHistoryDeleteCommandLine,
  buildHistoryDeleteRangeCommandLine,
  buildHistoryOpenCommandLine,
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

describe("build-picker-command-line bookmark / history lines", () => {
  it("builds bookmark -remove with validated ids", () => {
    assert.equal(buildBookmarkRemoveCommandLine(["12", "34"]), "bookmark -remove 12 34")
    assert.equal(buildBookmarkRemoveCommandLine(["abc_1-2"]), "bookmark -remove abc_1-2")
    assert.equal(buildBookmarkRemoveCommandLine([]), null)
    assert.equal(buildBookmarkRemoveCommandLine(["1", "bad id"]), null)
    assert.equal(buildBookmarkRemoveCommandLine(["1;rm"]), null)
    assert.equal(buildBookmarkRemoveCommandLine(["-1"]), null)
  })

  it("caps bulk ids", () => {
    const ids: string[] = []
    for (let i = 0; i < 201; i += 1) {
      ids.push(String(i))
    }
    assert.equal(buildBookmarkRemoveCommandLine(ids), null)
  })

  it("builds open lines only for http(s) URLs", () => {
    assert.equal(buildBookmarkOpenCommandLine("https://example.com/a"), "open https://example.com/a")
    assert.equal(buildHistoryOpenCommandLine("https://example.com/a"), "open https://example.com/a")
    assert.equal(buildBookmarkOpenCommandLine("javascript:alert(1)"), null)
    assert.equal(buildHistoryOpenCommandLine(""), null)
  })

  it("builds bookmark -move and -send", () => {
    assert.equal(
      buildBookmarkMoveCommandLine(["12", "34"], "1"),
      "bookmark -move 12 34 --parent 1"
    )
    assert.equal(buildBookmarkMoveCommandLine(["1"], "1"), null)
    assert.equal(
      buildBookmarkSendCommandLine("dev1", ["https://example.com/a"], "open"),
      "bookmark -send dev1 --open https://example.com/a"
    )
    assert.equal(
      buildBookmarkSendCommandLine("dev1", ["https://example.com/a"], "both"),
      "bookmark -send dev1 --both https://example.com/a"
    )
    assert.equal(buildBookmarkSendCommandLine("dev1", ["ftp://x"]), null)
  })

  it("builds history -delete with normalized URLs", () => {
    assert.equal(
      buildHistoryDeleteCommandLine(["https://a.example/x", "https://b.example/"]),
      "history -delete https://a.example/x https://b.example/"
    )
    assert.equal(buildHistoryDeleteCommandLine([]), null)
    assert.equal(buildHistoryDeleteCommandLine(["https://a.example/", "ftp://x"]), null)
  })

  it("builds history -delete-range with ISO bounds", () => {
    assert.equal(
      buildHistoryDeleteRangeCommandLine("2026-11-20T00:00:00.000Z", "2026-11-20T23:59:59.999Z"),
      "history -delete-range --from 2026-11-20T00:00:00.000Z --to 2026-11-20T23:59:59.999Z"
    )
    assert.equal(buildHistoryDeleteRangeCommandLine("1700000000000", "1700000999999")?.includes("--from 1700000000000"), true)
    assert.equal(buildHistoryDeleteRangeCommandLine("", "2026-11-20"), null)
    assert.equal(buildHistoryDeleteRangeCommandLine("2026-11-20; rm", "2026-11-21"), null)
  })
})
