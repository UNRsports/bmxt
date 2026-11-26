/**
 * EN: Pure history picker row builder (no i18n / chrome imports; unit-testable under plain node).
 * JA: 履歴ピッカー行の純粋ビルダー（i18n・chrome 依存なし）。
 */

import type { HistoryCacheEntry } from "../search/cache/types.ts"

/** EN: Same shape as `UiLocale` (kept local so this module has no i18n imports). */
export type HistoryRowsLocale = "ja" | "en"

export type HistoryPickerRow =
  | {
      kind: "month"
      monthKey: string
      label: string
    }
  | {
      kind: "day"
      dayKey: string
      monthKey: string
      label: string
    }
  | {
      kind: "visit"
      url: string
      title: string
      lastVisitTime: number
      visitCount: number
      dayKey: string
      monthKey: string
    }

export type HistoryPickerRowsBuildOptions = {
  /** EN: Optional case-insensitive substring filter on title/url. */
  pattern?: string
  locale: HistoryRowsLocale
  /** EN: Visit title formatter (display truncation / localisation). */
  formatVisitTitle: (title: string) => string
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function historyMonthKeyFromMs(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

export function historyDayKeyFromMs(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const monthFormatters = new Map<HistoryRowsLocale, Intl.DateTimeFormat>()
const dayFormatters = new Map<HistoryRowsLocale, Intl.DateTimeFormat>()

function monthFormatter(locale: HistoryRowsLocale): Intl.DateTimeFormat {
  const cached = monthFormatters.get(locale)
  if (cached !== undefined) {
    return cached
  }
  const formatter = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "long"
  })
  monthFormatters.set(locale, formatter)
  return formatter
}

function dayFormatter(locale: HistoryRowsLocale): Intl.DateTimeFormat {
  const cached = dayFormatters.get(locale)
  if (cached !== undefined) {
    return cached
  }
  const formatter = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  })
  dayFormatters.set(locale, formatter)
  return formatter
}

function formatMonthLabel(monthKey: string, locale: HistoryRowsLocale): string {
  const parts = monthKey.split("-")
  const year = Number(parts[0])
  const month = Number(parts[1])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return monthKey
  }
  const date = new Date(year, month - 1, 1)
  try {
    return monthFormatter(locale).format(date)
  } catch {
    return monthKey
  }
}

function formatDayLabel(dayKey: string, locale: HistoryRowsLocale): string {
  const parts = dayKey.split("-")
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return dayKey
  }
  const date = new Date(year, month - 1, day)
  try {
    return dayFormatter(locale).format(date)
  } catch {
    return dayKey
  }
}

function matchesPattern(entry: HistoryCacheEntry, pattern: string): boolean {
  if (pattern.length === 0) {
    return true
  }
  const needle = pattern.toLowerCase()
  if (entry.title.toLowerCase().includes(needle)) {
    return true
  }
  if (entry.url.toLowerCase().includes(needle)) {
    return true
  }
  return false
}

/**
 * EN: Bucket visits into month → day → visit rows (newest first).
 * JA: 訪問を月→日→訪問の行にバケツする（新しい順）。
 */
export function buildHistoryPickerRowsFromEntriesWith(
  entries: readonly HistoryCacheEntry[],
  options: HistoryPickerRowsBuildOptions
): HistoryPickerRow[] {
  const locale = options.locale
  const pattern = (options.pattern ?? "").trim()

  const filtered = entries
    .filter((e) => Number.isFinite(e.lastVisitTime) && e.lastVisitTime > 0)
    .filter((e) => matchesPattern(e, pattern))
    .slice()
    .sort((a, b) => b.lastVisitTime - a.lastVisitTime)

  const out: HistoryPickerRow[] = []
  let prevMonth = ""
  let prevDay = ""

  for (const entry of filtered) {
    const monthKey = historyMonthKeyFromMs(entry.lastVisitTime)
    const dayKey = historyDayKeyFromMs(entry.lastVisitTime)
    if (monthKey !== prevMonth) {
      out.push({
        kind: "month",
        monthKey,
        label: formatMonthLabel(monthKey, locale)
      })
      prevMonth = monthKey
      prevDay = ""
    }
    if (dayKey !== prevDay) {
      out.push({
        kind: "day",
        dayKey,
        monthKey,
        label: formatDayLabel(dayKey, locale)
      })
      prevDay = dayKey
    }
    const title =
      entry.title.trim().length > 0
        ? entry.title
        : entry.url.trim().length > 0
          ? entry.url
          : "(untitled)"
    out.push({
      kind: "visit",
      url: entry.url,
      title: options.formatVisitTitle(title),
      lastVisitTime: entry.lastVisitTime,
      visitCount: entry.visitCount,
      dayKey,
      monthKey
    })
  }

  return out
}
