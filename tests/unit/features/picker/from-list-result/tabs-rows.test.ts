import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  LIST_OUTPUT_SCHEMA,
  type ListResult
} from "../../../../../shared/lib/features/command-line/list-output/types.ts"
import { tabPickerRowsFromListResult } from "../../../../../shared/lib/features/picker/from-list-result/tabs-rows.ts"

describe("tabPickerRowsFromListResult", () => {
  it("restores groupColor from preceding tabs.group for --peers tagged local rows", () => {
    const listResult: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "tab",
      subcommand: "-list",
      records: [
        {
          kind: "tabs.window",
          fields: {
            windowId: 10,
            title: "Win",
            focused: true,
            deviceId: "local-dev",
            deviceName: "Local",
            remote: false
          },
          display: { label: "[Local] Win" }
        },
        {
          kind: "tabs.group",
          fields: {
            windowId: 10,
            groupId: 3,
            title: "Work",
            color: "blue",
            label: "【Work】",
            deviceId: "local-dev",
            deviceName: "Local",
            remote: false
          },
          display: { label: "[Local] 【Work】" }
        },
        {
          kind: "tabs.tab",
          fields: {
            tabId: 101,
            windowId: 10,
            groupId: 3,
            title: "Docs",
            url: "https://example.com/docs",
            active: true,
            deviceId: "local-dev",
            deviceName: "Local",
            remote: false
          },
          display: { label: "[Local] Docs" }
        },
        {
          kind: "tabs.tab",
          fields: {
            tabId: 102,
            windowId: 10,
            groupId: null,
            title: "Loose",
            url: "https://example.com/loose",
            active: false,
            deviceId: "local-dev",
            deviceName: "Local",
            remote: false
          },
          display: { label: "[Local] Loose" }
        }
      ]
    }

    const rows = tabPickerRowsFromListResult(listResult)
    const grouped = rows.find((row) => row.kind === "tab" && row.tabId === 101)
    const loose = rows.find((row) => row.kind === "tab" && row.tabId === 102)
    assert.ok(grouped && grouped.kind === "tab")
    assert.equal(grouped.groupColor, "blue")
    assert.ok(loose && loose.kind === "tab")
    assert.equal(loose.groupColor, null)
  })

  it("restores groupColor for remote peer tab rows", () => {
    const listResult: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "tab",
      subcommand: "-list",
      records: [
        {
          kind: "tabs.window",
          fields: {
            windowId: 7,
            title: "PeerWin",
            focused: false,
            deviceId: "peer-a",
            deviceName: "Peer",
            remote: true
          },
          display: { label: "[Peer] PeerWin" }
        },
        {
          kind: "tabs.group",
          fields: {
            windowId: 7,
            groupId: 42,
            title: "Pink",
            color: "pink",
            label: "【Pink】",
            deviceId: "peer-a",
            deviceName: "Peer",
            remote: true
          },
          display: { label: "[Peer] 【Pink】" }
        },
        {
          kind: "tabs.tab",
          fields: {
            tabId: null,
            remoteTabId: 900,
            windowId: 7,
            groupId: 42,
            title: "Remote tab",
            url: "https://peer.example/",
            active: false,
            deviceId: "peer-a",
            deviceName: "Peer",
            remote: true
          },
          display: { label: "[Peer] Remote tab" }
        }
      ]
    }

    const rows = tabPickerRowsFromListResult(listResult)
    const tab = rows.find((row) => row.kind === "tab")
    assert.ok(tab && tab.kind === "tab")
    assert.equal(tab.remote, true)
    assert.equal(tab.groupColor, "pink")
    assert.equal(tab.peerGroupId, 42)
  })
})
