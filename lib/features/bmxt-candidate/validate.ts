import {
  BMXT_CANDIDATE_SCHEMA,
  type BmxtCandidateCatalog,
  type BmxtCandidateCommandEntry,
  type BmxtCandidateDataSource,
  type BmxtCandidateSegmentContext
} from "./types.ts"
import { loadBmxtCandidateCatalog } from "./load-catalog.ts"

const KNOWN_LIST_OPERATORS = new Set(["&&", "||", ";"])

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function validateDataSource(source: unknown, path: string, issues: BmxtCandidateValidationIssue[]): void {
  if (typeof source !== "object" || source === null) {
    issues.push({ path, message: "expected object" })
    return
  }
  const row = source as BmxtCandidateDataSource
  if (!isNonEmptyString(row.id)) {
    issues.push({ path: `${path}.id`, message: "expected non-empty string" })
  }
  if (row.domain !== "browser" && row.domain !== "ui") {
    issues.push({ path: `${path}.domain`, message: "expected browser or ui" })
  }
  if (!isNonEmptyString(row.description)) {
    issues.push({ path: `${path}.description`, message: "expected non-empty string" })
  }
  if (row.filterDefault !== "prefix" && row.filterDefault !== "contains") {
    issues.push({ path: `${path}.filterDefault`, message: "expected prefix or contains" })
  }
}

function validateSegmentContext(ctx: unknown, path: string, issues: BmxtCandidateValidationIssue[]): void {
  if (typeof ctx !== "object" || ctx === null) {
    issues.push({ path, message: "expected object" })
    return
  }
  const row = ctx as BmxtCandidateSegmentContext
  if (!isNonEmptyString(row.id)) {
    issues.push({ path: `${path}.id`, message: "expected non-empty string" })
  }
  if (row.when.precededByOperator !== undefined) {
    for (const op of row.when.precededByOperator) {
      if (!KNOWN_LIST_OPERATORS.has(op)) {
        issues.push({ path: `${path}.when.precededByOperator`, message: `unknown operator ${op}` })
      }
    }
  }
}

function validateCommandEntry(entry: unknown, path: string, issues: BmxtCandidateValidationIssue[]): void {
  if (typeof entry !== "object" || entry === null) {
    issues.push({ path, message: "expected object" })
    return
  }
  const row = entry as BmxtCandidateCommandEntry
  if (!isNonEmptyString(row.command)) {
    issues.push({ path: `${path}.command`, message: "expected non-empty string" })
  }
  if (!Array.isArray(row.zones)) {
    issues.push({ path: `${path}.zones`, message: "expected array" })
  }
}

export type BmxtCandidateValidationIssue = {
  path: string
  message: string
}

/** EN: Non-throwing validation of manifest/bmxt-candidate.json shape. */
export function collectBmxtCandidateCatalogIssues(
  value: unknown,
  path = "catalog"
): BmxtCandidateValidationIssue[] {
  const issues: BmxtCandidateValidationIssue[] = []
  if (typeof value !== "object" || value === null) {
    issues.push({ path, message: "expected object" })
    return issues
  }
  const catalog = value as BmxtCandidateCatalog
  if (catalog.schemaVersion !== 1) {
    issues.push({ path: `${path}.schemaVersion`, message: "expected 1" })
  }
  if (catalog.profileSchema !== BMXT_CANDIDATE_SCHEMA) {
    issues.push({ path: `${path}.profileSchema`, message: `expected ${BMXT_CANDIDATE_SCHEMA}` })
  }
  if (typeof catalog.profile !== "object" || catalog.profile === null) {
    issues.push({ path: `${path}.profile`, message: "expected object" })
  } else if (!Array.isArray(catalog.profile.segmentContexts)) {
    issues.push({ path: `${path}.profile.segmentContexts`, message: "expected array" })
  } else {
    catalog.profile.segmentContexts.forEach((ctx, index) => {
      validateSegmentContext(ctx, `${path}.profile.segmentContexts[${index}]`, issues)
    })
  }
  if (!Array.isArray(catalog.dataSources)) {
    issues.push({ path: `${path}.dataSources`, message: "expected array" })
  } else {
    catalog.dataSources.forEach((source, index) => {
      validateDataSource(source, `${path}.dataSources[${index}]`, issues)
    })
  }
  if (!Array.isArray(catalog.commands)) {
    issues.push({ path: `${path}.commands`, message: "expected array" })
  } else {
    catalog.commands.forEach((entry, index) => {
      validateCommandEntry(entry, `${path}.commands[${index}]`, issues)
    })
  }
  return issues
}

export function validateBmxtCandidateCatalog(value: unknown): value is BmxtCandidateCatalog {
  return collectBmxtCandidateCatalogIssues(value).length === 0
}

export function assertBmxtCandidateCatalog(value: unknown): BmxtCandidateCatalog {
  const issues = collectBmxtCandidateCatalogIssues(value)
  if (issues.length > 0) {
    const detail = issues.map((i) => `${i.path}: ${i.message}`).join("; ")
    throw new Error(`invalid bmxtCandidate catalog: ${detail}`)
  }
  return value as BmxtCandidateCatalog
}

/** EN: Validate bundled manifest and cross-check provider ids referenced by commands. */
export function validateBundledBmxtCandidateCatalog(): BmxtCandidateValidationIssue[] {
  const catalog = loadBmxtCandidateCatalog()
  const issues = collectBmxtCandidateCatalogIssues(catalog)
  const providerIds = new Set(catalog.dataSources.map((s) => s.id))
  for (const [commandIndex, command] of catalog.commands.entries()) {
    for (const [zoneIndex, zone] of command.zones.entries()) {
      for (const [sourceIndex, source] of zone.sources.entries()) {
        if (source.kind === "runtime.dynamic") {
          if (!providerIds.has(source.provider)) {
            issues.push({
              path: `commands[${commandIndex}].zones[${zoneIndex}].sources[${sourceIndex}]`,
              message: `unknown data source provider ${source.provider}`
            })
          }
          if (source.labelFields !== undefined) {
            for (const labelField of source.labelFields) {
              if (!providerIds.has(labelField)) {
                issues.push({
                  path: `commands[${commandIndex}].zones[${zoneIndex}].sources[${sourceIndex}].labelFields`,
                  message: `unknown label field provider ${labelField}`
                })
              }
            }
          }
        }
      }
    }
  }
  const segmentIds = new Set(catalog.profile.segmentContexts.map((c) => c.id))
  const requiredContexts = ["compound.afterListOperator", "pipe.afterPipeOperator"]
  for (const required of requiredContexts) {
    if (!segmentIds.has(required)) {
      issues.push({ path: "profile.segmentContexts", message: `missing required context ${required}` })
    }
  }
  return issues
}
