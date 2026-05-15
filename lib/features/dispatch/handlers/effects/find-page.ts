import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { findPageLines } from "../../../find-sources/page-adapter"

type E = Extract<ChromeEffect, { kind: "find_page" }>

export async function applyFindPageEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  return findPageLines(e.pattern)
}
