import type { ListRecord, ListResult } from "../command-line/list-output/types.ts"
import { LIST_OUTPUT_SCHEMA } from "../command-line/list-output/types.ts"
import type { SessionListRow } from "./session-summary.ts"

export function buildSessionListResult(rows: readonly SessionListRow[]): ListResult {
  const records: ListRecord[] = rows.map((row) => ({
    kind: "session.row",
    fields: {
      index: row.index,
      sessionId: row.sessionId,
      displayName: row.displayName,
      active: row.isActive
    },
    display: {
      label: `${row.isActive ? "* " : "  "}${row.index}. ${row.displayName}`,
      detail: row.summary
    },
    pipeLine: [
      "session.row",
      `index=${row.index}`,
      `sessionId=${JSON.stringify(row.sessionId)}`,
      `displayName=${JSON.stringify(row.displayName)}`,
      `active=${row.isActive ? "true" : "false"}`
    ].join("\t")
  }))

  return {
    schema: LIST_OUTPUT_SCHEMA,
    command: "session",
    subcommand: "-list",
    records
  }
}
