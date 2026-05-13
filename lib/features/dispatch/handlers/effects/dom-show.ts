import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { bmxtDomShowInjected } from "../../../page-dom/injected-dom-show"

type E = Extract<ChromeEffect, { kind: "dom_show" }>

const MAX_TERMINAL_LINES = 900
const MAX_LINE_CHARS = 400

function bodyToTerminalLines(body: string): string[] {
  const raw = body.split(/\r?\n/)
  const out: string[] = []
  for (const ln of raw) {
    if (ln.length <= MAX_LINE_CHARS) {
      out.push(ln)
    } else {
      for (let i = 0; i < ln.length; i += MAX_LINE_CHARS) {
        out.push(ln.slice(i, i + MAX_LINE_CHARS))
      }
    }
    if (out.length >= MAX_TERMINAL_LINES) {
      out.push("…(output truncated for terminal; reload page is unchanged)")
      break
    }
  }
  return out
}

/**
 * EN: Prints DOM / element-tree snapshot to the session log only (not persisted as a separate store).
 * JA: セッションログへの表示のみ（別ストアへの保存は行いません）。
 */
export async function applyDomShowEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  const tabId = tab?.id
  if (tabId === undefined) {
    return [
      "(no target tab — focus a normal browser window with a page, then run dom -show again)",
      "EN/JA: BMXt は「最後にフォーカスした通常ウィンドウ」のアクティブタブを対象にします。"
    ]
  }
  const mode = e.flavor === "-react" ? "react" : "html"
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtDomShowInjected,
      args: [mode]
    })
    const r = result as { kind?: string; body?: string }
    const body = typeof r?.body === "string" ? r.body : ""
    const head: string[] = [
      `dom -show (${e.flavor}) tab ${tabId} — kind=${r?.kind ?? "?"} url=${tab?.url ?? "(none)"}`,
      "EN: Output is session text only; it is not written to extension storage by this command.",
      "JA: 出力はセッションテキストのみで、本コマンドから extension storage には書き込みません。"
    ]
    if (!body) {
      return [...head, "(empty capture)"]
    }
    return [...head, "---", ...bodyToTerminalLines(body)]
  } catch (err) {
    return [
      `error: executeScript failed — ${err instanceof Error ? err.message : String(err)}`,
      "EN: Ensure the tab is http(s) and the extension has scripting + host access.",
      "JA: 対象が http(s) か、scripting / host 権限を確認してください。"
    ]
  }
}
