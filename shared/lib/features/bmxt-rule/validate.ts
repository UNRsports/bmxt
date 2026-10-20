import { BMXT_RULE_SCHEMA, type BmxtRuleEntry, type BmxtRuleRecord, type BmxtRuleScalar, type BmxtRuleStream } from "./types.ts"

function isEntry(value: unknown): value is BmxtRuleEntry {
  if (!Array.isArray(value) || value.length !== 2) {
    return false
  }
  const [key, scalar] = value
  if (typeof key !== "string" || key.length === 0) {
    return false
  }
  return (
    scalar === null ||
    typeof scalar === "string" ||
    typeof scalar === "number" ||
    typeof scalar === "boolean"
  )
}

function isRecord(value: unknown): value is BmxtRuleRecord {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const record = value as BmxtRuleRecord
  if (typeof record.kind !== "string" || record.kind.length === 0) {
    return false
  }
  if (!Array.isArray(record.entries)) {
    return false
  }
  return record.entries.every(isEntry)
}

/** EN: Validate in-memory or parsed JSON stream shape. Unknown kinds are allowed. */
export function validateBmxtRuleStream(value: unknown): value is BmxtRuleStream {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const stream = value as BmxtRuleStream
  if (stream.schema !== BMXT_RULE_SCHEMA) {
    return false
  }
  if (!Array.isArray(stream.records)) {
    return false
  }
  if (!stream.records.every(isRecord)) {
    return false
  }
  if (stream.producer !== undefined) {
    if (!Array.isArray(stream.producer) || !stream.producer.every(isEntry)) {
      return false
    }
  }
  return true
}

export function assertBmxtRuleStream(value: unknown): BmxtRuleStream {
  if (!validateBmxtRuleStream(value)) {
    throw new Error("invalid bmxtRule stream")
  }
  return value
}

export function validateBmxtRuleRecord(value: unknown): value is BmxtRuleRecord {
  return isRecord(value)
}

export type BmxtRuleValidationIssue = {
  path: string
  message: string
}

/** EN: Non-throwing validation with issue paths (for tests and debug). */
export function collectBmxtRuleStreamIssues(value: unknown, path = "stream"): BmxtRuleValidationIssue[] {
  const issues: BmxtRuleValidationIssue[] = []
  if (typeof value !== "object" || value === null) {
    issues.push({ path, message: "expected object" })
    return issues
  }
  const stream = value as BmxtRuleStream
  if (stream.schema !== BMXT_RULE_SCHEMA) {
    issues.push({ path: `${path}.schema`, message: `expected ${BMXT_RULE_SCHEMA}` })
  }
  if (!Array.isArray(stream.records)) {
    issues.push({ path: `${path}.records`, message: "expected array" })
    return issues
  }
  stream.records.forEach((record, index) => {
    if (!isRecord(record)) {
      issues.push({ path: `${path}.records[${index}]`, message: "invalid record" })
    }
  })
  if (stream.producer !== undefined) {
    if (!Array.isArray(stream.producer)) {
      issues.push({ path: `${path}.producer`, message: "expected array" })
    } else {
      stream.producer.forEach((entry, index) => {
        if (!isEntry(entry)) {
          issues.push({ path: `${path}.producer[${index}]`, message: "invalid entry" })
        }
      })
    }
  }
  return issues
}

export function isBmxtRuleScalar(value: unknown): value is BmxtRuleScalar {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
}
