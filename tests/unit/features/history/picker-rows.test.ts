import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import type { HistoryCacheEntry } from "../../../../shared/lib/features/search/cache/types.ts"
import {
  buildHistoryPickerRowsFromEntriesWith,
  type HistoryPickerRow
} from "../../../../shared/lib/features/history/picker-rows-build.ts"
import {
  collapseHistoryDay,
  collapseHistoryMonth,
  computeHistoryVisibleRowIndices,
  resetHistoryFoldState
} from "../../../../shared/lib/features/history/fold-state.ts"
import {
  historyPickerRowsFromListResult,
  historyPickerRowsToListResult
} from "../../../../shared/lib/features/history/history-list-result.ts"
import {
  createHistoryPickerState,
  historyActionTargetRows,
  toggleHistoryRowMark
} from "../../../../shared/lib/features/history/history-picker-state.ts"
import {
  buildHistoryActionLine,
  historyActionsForTargets,
  historyDayBoundsMs,
  historyMonthBoundsMs,
  removeHistoryRows
} from "../../../../shared/lib/features/history/history-picker-view.ts"

function visit(url: string, title: string, y: number, m: number, d: number, h: number): HistoryCacheEntry {
  return {
    url,
    title,
    lastVisitTime: new Date(y, m - 1, d, h, 0, 0, 0).getTime(),
    visitCount: 1
  }
}

const ENTRIES: HistoryCacheEntry[] = [
  visit("https://a.example/", "A", 2026, 11, 20, 9),
  visit("https://b.example/", "B", 2026, 11, 20, 8),
  visit("https://c.example/", "C", 2026, 11, 3, 12),
  visit("https://d.example/", "D", 2026, 10, 30, 10)
]

function buildRows(
  entries: readonly HistoryCacheEntry[],
  pattern?: string
): HistoryPickerRow[] {
  return buildHistoryPickerRowsFromEntriesWith(entries, {
    pattern,
    locale: "en",
    formatVisitTitle: (title) => title
  })
}

function kinds(rows: readonly HistoryPickerRow[]): string[] {
  return rows.map((row) => {
    if (row.kind === "month") {
      return `month:${row.monthKey}`
    }
    if (row.kind === "day") {
      return `day:${row.dayKey}`
    }
    return `visit:${row.url}`
  })
}

describe("buildHistoryPickerRowsFromEntriesWith", () => {
  afterEach(() => {
    resetHistoryFoldState()
  })

  it("buckets visits into month, day, and visit rows newest first", () => {
    const rows = buildRows(ENTRIES)
    assert.deepEqual(kinds(rows), [
      "month:2026-11",
      "day:2026-11-20",
      "visit:https://a.example/",
      "visit:https://b.example/",
      "day:2026-11-03",
      "visit:https://c.example/",
      "month:2026-10",
      "day:2026-10-30",
      "visit:https://d.example/"
    ])
  })

  it("filters by pattern on title or url", () => {
    const rows = buildRows(ENTRIES, "c.example")
    assert.deepEqual(kinds(rows), ["month:2026-11", "day:2026-11-03", "visit:https://c.example/"])
  })

  it("skips entries without a valid visit time", () => {
    const rows = buildRows([
      { url: "https://x.example/", title: "X", lastVisitTime: 0, visitCount: 1 }
    ])
    assert.deepEqual(rows, [])
  })

  it("hides days and visits under a collapsed month, visits under a collapsed day", () => {
    const rows = buildRows(ENTRIES)
    assert.deepEqual(computeHistoryVisibleRowIndices(rows), [0, 1, 2, 3, 4, 5, 6, 7, 8])

    collapseHistoryDay("2026-11-20")
    assert.deepEqual(computeHistoryVisibleRowIndices(rows), [0, 1, 4, 5, 6, 7, 8])

    collapseHistoryMonth("2026-11")
    assert.deepEqual(computeHistoryVisibleRowIndices(rows), [0, 6, 7, 8])
  })
})

describe("history picker state and actions", () => {
  afterEach(() => {
    resetHistoryFoldState()
  })

  it("keeps marks homogeneous by kind", () => {
    const rows = buildRows(ENTRIES)
    const state = createHistoryPickerState(rows)
    const markedVisit = toggleHistoryRowMark(state, rows[2]!)
    assert.equal(markedVisit.markedKind, "visit")
    assert.equal(toggleHistoryRowMark(markedVisit, rows[1]!), markedVisit)
    const cleared = toggleHistoryRowMark(markedVisit, rows[2]!)
    assert.equal(cleared.markedKind, null)
  })

  it("targets marked rows, otherwise the highlighted row", () => {
    const rows = buildRows(ENTRIES)
    const base = createHistoryPickerState(rows)
    assert.deepEqual(historyActionTargetRows(base, rows[1]!), [rows[1]!])
    const marked = toggleHistoryRowMark(toggleHistoryRowMark(base, rows[2]!), rows[3]!)
    assert.deepEqual(historyActionTargetRows(marked, rows[1]!), [rows[2]!, rows[3]!])
  })

  it("picks actions and builds lines per target kind", () => {
    const rows = buildRows(ENTRIES)
    const month = rows[0]!
    const day = rows[1]!
    const visitA = rows[2]!
    const visitB = rows[3]!
    assert.deepEqual(historyActionsForTargets([visitA]), ["open", "delete"])
    assert.deepEqual(historyActionsForTargets([visitA, visitB]), ["delete"])
    assert.deepEqual(historyActionsForTargets([day]), ["deleteRange"])
    assert.deepEqual(historyActionsForTargets([month]), ["deleteRange"])
    assert.deepEqual(historyActionsForTargets([]), [])

    assert.equal(buildHistoryActionLine("open", [visitA]), "open https://a.example/")
    assert.equal(
      buildHistoryActionLine("delete", [visitA, visitB]),
      "history -delete https://a.example/ https://b.example/"
    )
    assert.equal(buildHistoryActionLine("delete", [day]), null)
    assert.equal(buildHistoryActionLine("open", [day]), null)
  })

  it("computes inclusive local day and month bounds", () => {
    const day = historyDayBoundsMs("2026-11-20")
    assert.notEqual(day, null)
    assert.equal(day!.fromMs, new Date(2026, 10, 20, 0, 0, 0, 0).getTime())
    assert.equal(day!.toMs, new Date(2026, 10, 21, 0, 0, 0, 0).getTime() - 1)

    const month = historyMonthBoundsMs("2026-11")
    assert.notEqual(month, null)
    assert.equal(month!.fromMs, new Date(2026, 10, 1, 0, 0, 0, 0).getTime())
    assert.equal(month!.toMs, new Date(2026, 11, 1, 0, 0, 0, 0).getTime() - 1)

    assert.equal(historyDayBoundsMs("not-a-day"), null)
    assert.equal(historyMonthBoundsMs("2026"), null)
  })

  it("builds a delete-range line from day bounds and joins multiple targets", () => {
    const rows = buildRows(ENTRIES)
    const dayA = rows[1]!
    const dayB = rows[4]!
    const bounds = historyDayBoundsMs("2026-11-20")!
    const expectedA =
      `history -delete-range --from ${new Date(bounds.fromMs).toISOString()}` +
      ` --to ${new Date(bounds.toMs).toISOString()}`
    assert.equal(buildHistoryActionLine("deleteRange", [dayA]), expectedA)
    const joined = buildHistoryActionLine("deleteRange", [dayA, dayB])
    assert.notEqual(joined, null)
    assert.equal(joined!.split(" && ").length, 2)
    assert.equal(joined!.startsWith(expectedA), true)
  })

  it("removes deleted visits and prunes empty day / month headers", () => {
    const rows = buildRows(ENTRIES)
    const afterOne = removeHistoryRows(rows, {
      urls: ["https://a.example/"],
      dayKeys: [],
      monthKeys: []
    })
    assert.deepEqual(kinds(afterOne), [
      "month:2026-11",
      "day:2026-11-20",
      "visit:https://b.example/",
      "day:2026-11-03",
      "visit:https://c.example/",
      "month:2026-10",
      "day:2026-10-30",
      "visit:https://d.example/"
    ])

    const afterMonthOctober = removeHistoryRows(rows, {
      urls: [],
      dayKeys: [],
      monthKeys: ["2026-10"]
    })
    assert.deepEqual(kinds(afterMonthOctober), [
      "month:2026-11",
      "day:2026-11-20",
      "visit:https://a.example/",
      "visit:https://b.example/",
      "day:2026-11-03",
      "visit:https://c.example/"
    ])

    const afterAllDay = removeHistoryRows(rows, {
      urls: ["https://c.example/"],
      dayKeys: ["2026-11-20"],
      monthKeys: []
    })
    assert.deepEqual(kinds(afterAllDay), ["month:2026-10", "day:2026-10-30", "visit:https://d.example/"])
  })
})

describe("history ListResult handoff", () => {
  it("round-trips rows and reuses the same-object cache for browse", () => {
    const rows = buildRows(ENTRIES)
    const listResult = historyPickerRowsToListResult(rows)
    const fromSame = historyPickerRowsFromListResult(listResult)
    assert.deepEqual(kinds(fromSame), kinds(rows))

    const cloned = {
      schema: listResult.schema,
      command: listResult.command,
      subcommand: listResult.subcommand,
      records: listResult.records
    }
    const fromClone = historyPickerRowsFromListResult(cloned)
    assert.deepEqual(kinds(fromClone), kinds(rows))
  })
})
