import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { moveTabsContiguous } from "../../../../shared/lib/features/tabs/controller/move-tabs-contiguous.ts"

type FakeTab = { id: number; index: number; windowId: number }

describe("moveTabsContiguous", () => {
  const originalChrome = globalThis.chrome
  let moved: { ids: number | number[]; props: { windowId: number; index: number } }[] = []
  let tabsById = new Map<number, FakeTab>()
  let batchReturnsEmpty = false

  function stripOf(windowId: number): FakeTab[] {
    return [...tabsById.values()]
      .filter((t) => t.windowId === windowId)
      .sort((a, b) => a.index - b.index)
  }

  function reindexWindow(windowId: number): void {
    const strip = stripOf(windowId)
    for (let i = 0; i < strip.length; i++) {
      const tab = strip[i]
      if (tab !== undefined) {
        tab.index = i
      }
    }
  }

  function applyMove(
    idList: number[],
    windowId: number,
    index: number
  ): FakeTab[] {
    const moving = idList
      .map((id) => tabsById.get(id))
      .filter((t): t is FakeTab => t !== undefined)
    for (const tab of moving) {
      tab.windowId = -999
      tab.index = -1
    }
    reindexWindow(windowId)
    const remainder = stripOf(windowId)
    let insertAt = index < 0 ? remainder.length : Math.min(index, remainder.length)
    const newOrder = [...remainder]
    for (const tab of moving) {
      tab.windowId = windowId
      newOrder.splice(insertAt, 0, tab)
      insertAt += 1
    }
    for (let i = 0; i < newOrder.length; i++) {
      const tab = newOrder[i]
      if (tab !== undefined) {
        tab.windowId = windowId
        tab.index = i
      }
    }
    return moving
  }

  beforeEach(() => {
    moved = []
    batchReturnsEmpty = false
    tabsById = new Map()
    const chromeStub = {
      tabs: {
        get: async (id: number) => {
          const tab = tabsById.get(id)
          if (tab === undefined) {
            throw new Error(`missing tab ${id}`)
          }
          return { ...tab }
        },
        move: async (
          ids: number | number[],
          props: { windowId?: number; index: number }
        ) => {
          const windowId = props.windowId ?? -1
          const idList = Array.isArray(ids) ? ids : [ids]
          moved.push({
            ids,
            props: { windowId, index: props.index }
          })
          const moving = applyMove(idList, windowId, props.index)
          if (batchReturnsEmpty && idList.length > 1) {
            return []
          }
          return moving.map((t) => ({ ...t }))
        }
      }
    }
    ;(globalThis as { chrome: typeof chromeStub }).chrome = chromeStub
  })

  afterEach(() => {
    ;(globalThis as { chrome: typeof originalChrome }).chrome = originalChrome
  })

  it("stages at end then moves before a live beforeTabId (cross-browser)", async () => {
    // Strip: [50@0, 20@1, 99@2, 30@3] — move 50 and 30 before 99.
    tabsById.set(50, { id: 50, index: 0, windowId: 1 })
    tabsById.set(20, { id: 20, index: 1, windowId: 1 })
    tabsById.set(99, { id: 99, index: 2, windowId: 1 })
    tabsById.set(30, { id: 30, index: 3, windowId: 1 })

    const ordered = await moveTabsContiguous([30, 50], 1, 2, { beforeTabId: 99 })

    assert.deepEqual(ordered, [50, 30])
    assert.equal(moved.length, 2)
    assert.deepEqual(moved[0], {
      ids: [50, 30],
      props: { windowId: 1, index: -1 }
    })
    assert.equal(moved[1]!.props.index, 1)
    assert.deepEqual(
      stripOf(1).map((t) => t.id),
      [20, 50, 30, 99]
    )
  })

  it("uses a single end-of-window move when index is -1", async () => {
    tabsById.set(2, { id: 2, index: 0, windowId: 4 })
    tabsById.set(1, { id: 1, index: 1, windowId: 4 })
    const ordered = await moveTabsContiguous([1, 2], 4, -1)
    assert.deepEqual(ordered, [2, 1])
    assert.equal(moved.length, 1)
    assert.deepEqual(moved[0], {
      ids: [2, 1],
      props: { windowId: 4, index: -1 }
    })
    assert.deepEqual(
      stripOf(4).map((t) => t.id),
      [2, 1]
    )
  })

  it("falls back to sequential single-id moves when batch returns []", async () => {
    batchReturnsEmpty = true
    tabsById.set(10, { id: 10, index: 0, windowId: 1 })
    tabsById.set(11, { id: 11, index: 1, windowId: 1 })
    tabsById.set(12, { id: 12, index: 2, windowId: 1 })

    await moveTabsContiguous([10, 11], 1, -1)

    assert.ok(moved.length >= 3)
    assert.deepEqual(moved[0], {
      ids: [10, 11],
      props: { windowId: 1, index: -1 }
    })
    assert.deepEqual(moved[1], {
      ids: 10,
      props: { windowId: 1, index: -1 }
    })
    assert.deepEqual(moved[2], {
      ids: 11,
      props: { windowId: 1, index: -1 }
    })
  })

  it("moves a non-contiguous selection as one block before the anchor", async () => {
    // Mirror picker gap: movers 10,20,40 with 30 between; insert before 50.
    tabsById.set(10, { id: 10, index: 0, windowId: 1 })
    tabsById.set(20, { id: 20, index: 1, windowId: 1 })
    tabsById.set(30, { id: 30, index: 2, windowId: 1 })
    tabsById.set(40, { id: 40, index: 3, windowId: 1 })
    tabsById.set(50, { id: 50, index: 4, windowId: 1 })

    const ordered = await moveTabsContiguous([10, 20, 40], 1, 4, {
      beforeTabId: 50
    })
    assert.deepEqual(ordered, [10, 20, 40])
    assert.equal(moved.length, 2)
    assert.equal(moved[0]!.props.index, -1)
    assert.deepEqual(
      stripOf(1).map((t) => t.id),
      [30, 10, 20, 40, 50]
    )
  })
})
