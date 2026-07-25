import type { ListRecord, ListResult } from "../command-line/list-output/types.ts"
import { LIST_OUTPUT_SCHEMA } from "../command-line/list-output/types.ts"
import { buildSettingPickerRows } from "./setting-picker-rows.ts"
import type { UiLocale } from "./locale.ts"
import type { UiSettings } from "./settings.ts"

const PLAIN_LIST_EXCLUDED_ROW_IDS = new Set(["save", "cancel"])

export function buildSettingListResult(
  uiSettings: UiSettings,
  locale: UiLocale
): ListResult {
  const rows = buildSettingPickerRows("main", locale, uiSettings.appearance).filter(
    (row) => !PLAIN_LIST_EXCLUDED_ROW_IDS.has(row.id)
  )
  const records: ListRecord[] = rows.map((row) => ({
    kind: "setting.field",
    fields: {
      key: row.id,
      value: row.line
    },
    display: {
      label: row.line
    },
    pipeLine: ["setting.field", `key=${row.id}`, `value=${JSON.stringify(row.line)}`].join("\t")
  }))

  return {
    schema: LIST_OUTPUT_SCHEMA,
    command: "setting",
    subcommand: "-list",
    records
  }
}
