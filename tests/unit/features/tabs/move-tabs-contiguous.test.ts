import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { moveTabsContiguous } from "../../../../shared/lib/features/tabs/controller/move-tabs-contiguous.ts"

type FakeTab = { id: number; index: number; windowId: number }

describe("moveTabsContiguous", () => {
  const originalChrome = globalThis.chrome
  let moved: { ids: number | number[]; props: { windowId: number; index: number } }[] = []
  let tabsById = new Map<number, FakeTab>()

  beforeEach(() => {
    moved = []
    tabsById = new Map()
    const chromeStub = {
      tabs: {
        get: async (id: number) => {
          const tab = tabsById.get(id)
          if (tab === undefined) {
            throw new Error(`missing tab ${id}`)
          }
          return tab
        },
        move: async (
          ids: number | number[],
          props: { windowId?: number; index: number }
        ) => {
          moved.push({
            ids,
            props: { windowId: props.windowId ?? -1, index: props.index }
          })
          return []
        }
      }
    }
    ;(globalThis as { chrome: typeof chromeStub }).chrome = chromeStub
  })

  afterEach(() => {
    ;(globalThis as { chrome: typeof originalChrome }).chrome = originalChrome
  })

  it("sorts by current strip index and adjusts destination for tabs already before it", async () => {
    // Strip: [50@0, 20@1, 99@2, 30@3] — move 50 and 30 before 99 (index 2).
    tabsById.set(50, { id: 50, index: 0, windowId: 1 })
    tabsById.set(20, { id: 20, index: 1, windowId: 1 })
    tabsById.set(99, { id: 99, index: 2, windowId: 1 })
    tabsById.set(30, { id: 30, index: 3, windowId: 1 })

    // Caller passes id-sorted order (old picker bug); helper must restore visual order.
    const ordered = await moveTabsContiguous([30, 50], 1, 2)

    assert.deepEqual(ordered, [50, 30])
    assert.equal(moved.length, 1)
    // 50 sits before dest index 2 → adjust to 1; batch lands as contiguous block.
    assert.deepEqual(moved[0], {
      ids: [50, 30],
      props: { windowId: 1, index: 1 }
    })
  })

  it("uses index -1 for end-of-window without adjustment", async () => {
    tabsById.set(2, { id: 2, index: 0, windowId: 4 })
    tabsById.set(1, { id: 1, index: 1, windowId: 4 })
    const ordered = await moveTabsContiguous([1, 2], 4, -1)
    assert.deepEqual(ordered, [2, 1])
    assert.deepEqual(moved[0], {
      ids: [2, 1],
      props: { windowId: 4, index: -1 }
    })
  })
})
