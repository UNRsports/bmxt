import type { CommandContext, CommandSpec } from "../../types"
import { TABS_MAN_LINES, TABS_RUN_HINT, TABS_USAGE_LINES } from "./help"

function usageLines(): string[] {
  return [...TABS_USAGE_LINES]
}

function normFlag(arg: string | undefined): "l" | "mu" | "nu" | null {
  if (!arg) {
    return null
  }
  const a = arg.toLowerCase()
  if (a === "-l" || a === "-list" || a === "--list") {
    return "l"
  }
  if (a === "-mu" || a === "-moveurl" || a === "--moveurl") {
    return "mu"
  }
  if (a === "-nu" || a === "-nowurl" || a === "--nowurl") {
    return "nu"
  }
  return null
}

function parseHttpUrl(urlStr: string): string | null {
  const t = urlStr.trim()
  if (!t) {
    return null
  }
  try {
    const u = new URL(t)
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return null
    }
    return u.href
  } catch {
    return null
  }
}

async function executeMoveUrl(urlRaw: string): Promise<string[]> {
  const normalized = parseHttpUrl(urlRaw)
  if (!normalized) {
    return ["usage: tabs -mu|-moveurl <http(s)-url>", ...usageLines()]
  }
  const tabs = await chrome.tabs.query({})
  const httpTabs = tabs.filter(
    (tab) =>
      tab.id !== undefined &&
      tab.url &&
      (tab.url.startsWith("http://") || tab.url.startsWith("https://"))
  )
  const exact = httpTabs.find((tab) => tab.url === normalized)
  const byOpenedPrefix = httpTabs.find((tab) => tab.url!.startsWith(normalized))
  const byTypedPrefix = httpTabs.find((tab) => {
    const tu = tab.url!
    if (!normalized.startsWith(tu)) {
      return false
    }
    if (normalized.length === tu.length) {
      return true
    }
    const next = normalized[tu.length]
    return next === "/" || next === "?" || next === "#"
  })
  const pick = exact ?? byOpenedPrefix ?? byTypedPrefix
  if (pick?.id !== undefined) {
    await chrome.tabs.update(pick.id, { active: true })
    if (pick.windowId !== undefined) {
      await chrome.windows.update(pick.windowId, { focused: true })
    }
    return [`activated tab ${pick.id}: ${pick.url}`]
  }
  const created = await chrome.tabs.create({ url: normalized })
  return [`opened new tab ${created.id ?? "?"}: ${normalized}`]
}

export const tabsCommand: CommandSpec = {
  name: "tabs",
  summary: "tab picker (-l), jump by URL (-mu), print current URL (-nu)",
  usage: [
    "tabs -l [-u]",
    "tabs -mu|-moveurl <url>",
    "tabs -nu|-nowurl"
  ],
  man: TABS_MAN_LINES,
  async execute(ctx, args) {
    const sub = normFlag(args[1])
    if (sub === null) {
      if (args[1] === undefined) {
        return ["error: tabs requires a subcommand.", ...usageLines()]
      }
      return [`error: unknown tabs option: ${args[1]}`, ...usageLines()]
    }
    if (sub === "l") {
      if (args.length > 3 || (args[2] !== undefined && args[2].toLowerCase() !== "-u")) {
        return [`error: invalid tabs -l usage`, ...usageLines()]
      }
      return [
        "Tab picker is opened from the BMXt prompt with:  tabs -l   or   tabs -l -u",
        TABS_RUN_HINT
      ]
    }
    if (sub === "nu") {
      if (args.length > 2) {
        return [`error: too many arguments`, ...usageLines()]
      }
      const tab = await ctx.resolveTabArg(undefined)
      const u = tab?.url
      if (!u) {
        return ["(no URL for current tab — focus a normal window with a page, or pass a tab id context)"]
      }
      return [u]
    }
    if (sub === "mu") {
      const urlPart = args.slice(2).join(" ").trim()
      if (!urlPart) {
        return ["usage: tabs -mu|-moveurl <http(s)-url>", ...usageLines()]
      }
      return executeMoveUrl(urlPart)
    }
    return usageLines()
  }
}
