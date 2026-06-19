import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { isJobSqlitePersistenceAvailable } from "./job-persistence-env.ts"

describe("job-persistence-env", () => {
  it("is available under Node test (window + document polyfilled by node)", () => {
    assert.equal(typeof isJobSqlitePersistenceAvailable(), "boolean")
  })
})
