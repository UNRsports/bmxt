import type { ListCommandEntry } from "../command-line/list-commands/types.ts"
import { parseSettingListLine } from "./setting-list-parse.ts"
import { buildSettingListResult } from "./setting-list-result.ts"
import { formatSettingListPlainLines } from "./setting-list-plain.ts"

export type SettingListMatch = Record<string, never>

export const settingListCommand: ListCommandEntry<SettingListMatch> = {
  id: "setting",
  command: "setting",
  runtime: "ui",
  matchPlain(segment) {
    const parsed = parseSettingListLine(segment)
    if (parsed === null || parsed.picker) {
      return null
    }
    return {}
  },
  usesPicker(segment) {
    return parseSettingListLine(segment)?.picker === true
  },
  async fetchListResult(_match, ctx) {
    if (ctx.deps === undefined) {
      throw new Error("setting -list requires UI dispatch deps")
    }
    return buildSettingListResult(ctx.deps.uiSettings, ctx.locale)
  },
  formatPlainLines(result, locale) {
    return formatSettingListPlainLines(result, locale)
  }
}
