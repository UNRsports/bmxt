import { expandDispatchMsgs } from "../bmxt-core/expand-msgs.ts"
import type { UiLocale } from "../setting/locale"
import type { SnapshotSaveFromTabResult } from "./snapshot-save-tab"

/** EN: Terminal log lines for one `snapshot -save` attempt (Chrome outcome → msgs expand). */
export function snapshotSaveLogLinesForResult(
  locale: UiLocale,
  result: SnapshotSaveFromTabResult
): string[] {
  if (result.ok === true) {
    return expandDispatchMsgs(
      [
        {
          key: "cmd.snapshot.save.done",
          params: { path: result.result.path, title: result.result.title }
        }
      ],
      locale
    )
  }
  if (result.code === "not_scriptable") {
    return expandDispatchMsgs(
      [
        {
          key: "cmd.snapshot.save.notHttp",
          params: { url: result.url ?? "(no url)" }
        }
      ],
      locale
    )
  }
  const msgs = [{ key: "cmd.snapshot.save.failed", params: { message: result.message } }]
  if (result.code === "empty_body") {
    return expandDispatchMsgs(
      [...msgs, { key: "cmd.snapshot.save.reloadAdvice" }],
      locale
    )
  }
  return expandDispatchMsgs(msgs, locale)
}
