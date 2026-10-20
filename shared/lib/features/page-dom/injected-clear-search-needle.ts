/** EN: Injected — clear BMXt search needle highlights in-page. */
import { clearBmxtNeedleHighlights } from "./injected-needle-highlight"
import { resetBmxtSearchNeedleSession } from "./injected-scroll-to-search-needle"

export function bmxtClearSearchNeedleHighlightInjected(): { ok: boolean } {
  resetBmxtSearchNeedleSession()
  clearBmxtNeedleHighlights()
  return { ok: true }
}
