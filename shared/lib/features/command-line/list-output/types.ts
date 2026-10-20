/** EN: Canonical list-output schema for `-list` subcommands (pipe / plain / picker). */

export const LIST_OUTPUT_SCHEMA = "bmxt-list/1" as const

export type ListRecordKind =
  | "tabs.window"
  | "tabs.group"
  | "tabs.tab"
  | "dom.node"
  | "dom.notice"
  | "search.hit"
  | "session.row"
  | "setting.field"

export type ListFieldValue = string | number | boolean | null

export type ListRecord = {
  kind: ListRecordKind
  fields: Record<string, ListFieldValue>
  /** EN: Human-oriented plain line parts (locale may apply to label). */
  display?: {
    indent?: number
    label: string
    detail?: string
  }
  /** EN: Single pipe row; auto-generated from kind + fields when omitted. */
  pipeLine?: string
}

export type ListResult = {
  schema: typeof LIST_OUTPUT_SCHEMA
  command: string
  subcommand: string
  records: ListRecord[]
  meta?: {
    sourceTabId?: number
    truncatedCapture?: boolean
  }
}
