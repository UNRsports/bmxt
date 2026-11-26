import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { bmxtRuleStreamFromResolvedTabs } from "../../../../../../shared/lib/features/bmxt-rule/adapters/from-tab-ids.ts"
import { tabIdsFromBmxtRuleStream } from "../../../../../../shared/lib/features/command-line/pipe/consumers/stream-accepts-kinds.ts"
import { buildTabMoveCommandLine } from "../../../../../../shared/lib/features/picker/build-picker-command-line.ts"
import {
  resolveBeforeTabIdOutsideMovers,
  resolveMoveInsertSlot
} from "../../../../../../shared/lib/features/tabs/resolve-move-insert-slot.ts"
import type { TabPickerRow } from "../../../../../../shared/lib/features/tabs/picker-rows.ts"

describe("picker bulk move command assembly (chip stream)", () => {
  it("keeps every chip id through requireUrl:false stream into move ids", () => {
    const stream = bmxtRuleStreamFromResolvedTabs(
      [
        {
          tabId: 10,
          url: "https://a.example/",
          pageTitle: "A",
          groupId: -1,
          groupTitle: null,
          groupColor: null
        },
        {
          tabId: 11,
          url: "",
          pageTitle: "Blank",
          groupId: -1,
          groupTitle: null,
          groupColor: null
        },
        {
          tabId: 12,
          url: "chrome://settings/",
          pageTitle: "Settings",
          groupId: -1,
          groupTitle: null,
          groupColor: null
        }
      ],
      { requireUrl: false }
    )
    const tabIds = tabIdsFromBmxtRuleStream(stream)
    assert.deepEqual(tabIds, [10, 11, 12])
    const line = buildTabMoveCommandLine(tabIds, {
      windowId: 1,
      beforeTabId: 99
    })
    assert.equal(line, "#t:10 #t:11 #t:12 | move --window 1 --before-tab 99")
  })

  it("rewrites --before-tab when the insert slot sits on a moving tab", () => {
    const rows: TabPickerRow[] = [
      {
        kind: "window",
        windowId: 1,
        label: "w1",
        windowTitle: "w1",
        usesActiveTabTitle: false,
        focused: false,
        deviceId: "local",
        remote: false,
        peerWindowId: null
      },
      {
        kind: "tab",
        tabId: 10,
        windowId: 1,
        groupId: null,
        groupColor: null,
        title: "t10",
        url: "https://example/10",
        faviconSrc: null,
        active: false,
        deviceId: "local",
        remote: false,
        peerTabId: null,
        peerWindowId: null,
        peerGroupId: null
      },
      {
        kind: "tab",
        tabId: 20,
        windowId: 1,
        groupId: null,
        groupColor: null,
        title: "t20",
        url: "https://example/20",
        faviconSrc: null,
        active: false,
        deviceId: "local",
        remote: false,
        peerTabId: null,
        peerWindowId: null,
        peerGroupId: null
      },
      {
        kind: "tab",
        tabId: 30,
        windowId: 1,
        groupId: null,
        groupColor: null,
        title: "t30",
        url: "https://example/30",
        faviconSrc: null,
        active: false,
        deviceId: "local",
        remote: false,
        peerTabId: null,
        peerWindowId: null,
        peerGroupId: null
      }
    ]
    const visible = rows.map((_, i) => i)
    const slot = resolveMoveInsertSlot(rows, visible, 2)
    assert.ok(slot)
    assert.equal(slot!.beforeTabId, 20)
    const before = resolveBeforeTabIdOutsideMovers(rows, slot!.beforeTabId, [10, 20])
    assert.equal(before, 30)
    const line = buildTabMoveCommandLine([10, 20], {
      windowId: slot!.windowId,
      beforeTabId: before ?? undefined
    })
    assert.equal(line, "#t:10 #t:20 | move --window 1 --before-tab 30")
  })
})
