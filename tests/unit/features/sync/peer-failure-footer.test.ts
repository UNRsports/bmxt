import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { LIST_OUTPUT_SCHEMA } from "../../../../shared/lib/features/command-line/list-output/types.ts"
import { peerFailureTokensFromListResult } from "../../../../shared/lib/features/sync/bus/peer-failure-tokens.ts"

describe("peer-failure-tokens", () => {
  it("returns empty when no sync notices", () => {
    const tokens = peerFailureTokensFromListResult({
      schema: LIST_OUTPUT_SCHEMA,
      command: "tab",
      subcommand: "-list",
      records: []
    })
    assert.deepEqual(tokens, [])
  })

  it("keeps only peer-failure tokens from syncNotices", () => {
    const tokens = peerFailureTokensFromListResult({
      schema: LIST_OUTPUT_SCHEMA,
      command: "tab",
      subcommand: "-list",
      records: [],
      meta: {
        syncNotices:
          "sync.list.peerFailed:dev-a:timeout\nsync.list.noConnectedPeers\nother.noise"
      }
    })
    assert.deepEqual(tokens, [
      "sync.list.peerFailed:dev-a:timeout",
      "sync.list.noConnectedPeers"
    ])
  })
})
