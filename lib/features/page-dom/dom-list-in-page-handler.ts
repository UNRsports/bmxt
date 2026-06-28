/** EN: Dispatch dom -list in-page requests inside the content script bundle. */
/** JA: 常駐 CS 内で dom -list のページ内リクエストを処理する。 */

import { bmxtDomSemanticEntriesInjected } from "./injected-dom-semantic-entries.ts"
import {
  bmxtDomClearHighlightInjected,
  bmxtDomScrollToPathInjected
} from "./injected-dom-scroll-to-path.ts"
import {
  isDomClearHighlightRequest,
  isDomScrollToPathRequest,
  isDomSemanticEntriesRequest,
  type DomClearHighlightResponse,
  type DomScrollToPathResponse,
  type DomSemanticEntriesPayload
} from "./dom-list-in-page-message.ts"

export type DomListInPageHandlerResult =
  | DomSemanticEntriesPayload
  | DomScrollToPathResponse
  | DomClearHighlightResponse

/** EN: Returns a response when handled; `null` when the message is unrelated. */
export function handleDomListInPageMessage(raw: unknown): DomListInPageHandlerResult | null {
  if (isDomSemanticEntriesRequest(raw)) {
    return bmxtDomSemanticEntriesInjected(
      raw.mode,
      raw.kind,
      raw.scope ?? "viewport",
      raw.showTag === true,
      raw.emptyImageAltLabel ?? "no alt"
    )
  }
  if (isDomScrollToPathRequest(raw)) {
    return bmxtDomScrollToPathInjected(raw.path, { persist: raw.persist === true })
  }
  if (isDomClearHighlightRequest(raw)) {
    return bmxtDomClearHighlightInjected()
  }
  return null
}
