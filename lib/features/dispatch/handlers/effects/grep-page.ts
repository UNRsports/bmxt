import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { grepPageLines } from "../../../grep-sources/page-adapter"

type E = Extract<ChromeEffect, { kind: "grep_page" }>

export async function applyGrepPageEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  return grepPageLines(e.pattern)
}
