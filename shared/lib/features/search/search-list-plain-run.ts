/** EN: Plain search -list runner (notices for cross-device). Kept free of list-command entry. */

import type { DispatchHostContext } from "../dispatch/dispatch-context.ts"
import type { UiLocale } from "../setting/locale.ts"
import type { DeviceListScope } from "../sync/bus/device-list-scope.ts"
import { fetchCrossDeviceSearchList } from "../sync/bus/fetch-cross-device-search.ts"
import { expandSyncLogLines } from "../sync/facade/expand-sync-log.ts"
import { fetchSearchListResult, formatSearchListPlainLines } from "./search-list-plain.ts"

export type SearchListPlainRunMatch = {
  dispatchLine: string
  peerDispatchLine: string
  scope: DeviceListScope
}

/** EN: Plain run with cross-device notices prepended. */
export async function runSearchListPlainWithNotices(
  match: SearchListPlainRunMatch,
  ctx: DispatchHostContext,
  locale: UiLocale,
  onProgress?: (message: string) => Promise<void>
): Promise<string[]> {
  if (match.scope.kind === "local") {
    const result = await fetchSearchListResult({
      dispatchLine: match.peerDispatchLine,
      ctx,
      locale,
      onProgress
    })
    return formatSearchListPlainLines(result, locale)
  }
  const fetched = await fetchCrossDeviceSearchList({
    dispatchLine: match.dispatchLine,
    scope: match.scope,
    ctx,
    locale,
    onProgress
  })
  const notices = expandSyncLogLines(fetched.notices, locale)
  return [...notices, ...formatSearchListPlainLines(fetched.result, locale)]
}
