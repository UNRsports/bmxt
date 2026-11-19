import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  LOCALHOST_DOOR_BASE_URL,
  LOCALHOST_DOOR_HOST_PERMISSIONS,
  LOCALHOST_DOOR_PORT
} from "../../../../shared/lib/features/sync/handshake/localhost/door-constants.ts"

describe("localhost listener constants", () => {
  it("uses fixed port 17653 and loopback-only host permissions", () => {
    assert.equal(LOCALHOST_DOOR_PORT, 17653)
    assert.equal(LOCALHOST_DOOR_BASE_URL, "http://127.0.0.1:17653")
    assert.deepEqual([...LOCALHOST_DOOR_HOST_PERMISSIONS], [
      "http://127.0.0.1:17653/*",
      "http://localhost:17653/*"
    ])
  })
})
