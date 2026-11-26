import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import {
  filterTabIdsNotInSet,
  moveTabGroupsAsUnits
} from "../../../../shared/lib/features/tabs/controller/move-tab-groups-as-units.ts"

describe("moveTabGroupsAsUnits", () => {
  const originalChrome = globalThis.chrome
  let movedGroups: { groupId: number; windowId: number; index: number }[] = []

  beforeEach(() => {
    movedGroups = []
    const chromeStub = {
      tabs: {
        query: async (query: { groupId?: number }) => {
          const gid = query.groupId
          if (gid === 10) {
            return [{ id: 100 }, { id: 101 }]
          }
          if (gid === 11) {
            return [{ id: 200 }, { id: 201 }]
          }
          return []
        }
      },
      tabGroups: {
        move: async (
          groupId: number,
          props: { windowId: number; index: number }
        ) => {
          movedGroups.push({
            groupId,
            windowId: props.windowId,
            index: props.index
          })
          return { id: groupId }
        }
      }
    }
    // @ts-expect-error test stub
    globalThis.chrome = chromeStub
  })

  afterEach(() => {
    globalThis.chrome = originalChrome
  })

  it("moves each group sequentially via tabGroups.move", async () => {
    const { movedTabIds } = await moveTabGroupsAsUnits({
      groupIds: [10, 11],
      windowId: 7,
      index: -1
    })
    assert.deepEqual(movedGroups, [
      { groupId: 10, windowId: 7, index: -1 },
      { groupId: 11, windowId: 7, index: -1 }
    ])
    assert.deepEqual([...movedTabIds].sort((a, b) => a - b), [100, 101, 200, 201])
  })

  it("filterTabIdsNotInSet drops covered ids", () => {
    assert.deepEqual(
      filterTabIdsNotInSet([100, 50, 201], new Set([100, 201])),
      [50]
    )
  })
})
