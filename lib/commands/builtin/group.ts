import type { CommandSpec } from "../types"

export const groupCommand: CommandSpec = {
  name: "group",
  summary: "create a tab group from tab ids or interactive picker",
  usage: ["group new", "group new <tabId> [tabId ...]"],
  man: [
    "NAME",
    "  group - create a tab group from tab ids",
    "",
    "SYNOPSIS",
    "  group new",
    "  group new <tabId> [tabId ...]",
    "",
    "INTERACTIVE",
    "  Run  group new  alone (Enter) in the BMXt window to open the picker:",
    "  arrow keys move highlight, Tab toggles selection, Enter sets name and color.",
    "",
    "NOTE",
    "  Tabs must belong to the same window."
  ],
  async execute(_ctx, args) {
    const sub = args[1]?.toLowerCase()
    if (sub !== "new") {
      return ["usage: group new | group new <tabId> [tabId ...]"]
    }
    const tabIds = args
      .slice(2)
      .map((v) => Number(v))
      .filter((v) => Number.isInteger(v))
    if (tabIds.length === 0) {
      return [
        "Interactive: in BMXt type  group new  and Enter (no tab ids).",
        "Non-interactive: group new <tabId> [tabId ...]"
      ]
    }
    const groupId = await chrome.tabs.group({ tabIds })
    return [`created group ${groupId}`]
  }
}
