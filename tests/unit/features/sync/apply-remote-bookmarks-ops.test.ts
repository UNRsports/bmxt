import assert from "node:assert/strict"
import { describe, it, beforeEach } from "node:test"
import { applyRemoteBookmarksOps } from "../../../../shared/lib/features/sync/bus/apply-remote-bookmarks-ops.ts"

type CreateArgs = {
  url?: string
  title?: string
  parentId?: string
}

describe("applyRemoteBookmarksOps", () => {
  let createCalls: CreateArgs[]
  let removeCalls: string[]
  let getCalls: string[]

  beforeEach(() => {
    createCalls = []
    removeCalls = []
    getCalls = []
    ;(globalThis as { chrome?: unknown }).chrome = {
      bookmarks: {
        create: async (args: CreateArgs) => {
          createCalls.push(args)
          return { id: "1" }
        },
        remove: async (id: string) => {
          removeCalls.push(id)
        },
        removeTree: async () => undefined,
        move: async () => ({ id: "1" }),
        get: async (id: string) => {
          getCalls.push(id)
          return [{ id, url: "https://example.com/" }]
        }
      }
    }
  })

  it("creates a bookmark with sanitized parent", async () => {
    const result = await applyRemoteBookmarksOps({
      kind: "create",
      url: "https://example.com/",
      title: "Example",
      parentId: "folder1"
    })
    assert.equal(result.ok, true)
    assert.deepEqual(createCalls, [
      {
        url: "https://example.com/",
        title: "Example",
        parentId: "folder1"
      }
    ])
  })

  it("rejects non-http urls", async () => {
    const result = await applyRemoteBookmarksOps({
      kind: "create",
      url: "javascript:alert(1)",
      title: "x",
      parentId: null
    })
    assert.equal(result.ok, false)
    assert.equal(result.detail, "bad_url")
    assert.equal(createCalls.length, 0)
  })

  it("removes bookmark ids", async () => {
    const result = await applyRemoteBookmarksOps({
      kind: "remove",
      bookmarkIds: ["id1", "bad id!", ""]
    })
    assert.equal(result.ok, true)
    assert.deepEqual(getCalls, ["id1"])
    assert.deepEqual(removeCalls, ["id1"])
  })
})
