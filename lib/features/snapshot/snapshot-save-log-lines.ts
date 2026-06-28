import type { UiLocale } from "../setting/locale"
import { tCmd } from "../setting/i18n/ns/cmd.ts"
import type { SnapshotSaveFromTabResult } from "./snapshot-save-tab"

/** EN: Terminal log lines for one `snapshot -save` attempt (no prompt echo). */
export function snapshotSaveLogLinesForResult(
  locale: UiLocale,
  result: SnapshotSaveFromTabResult
): string[] {
  if (result.ok === true) {
    return [
      tCmd("cmd.snapshot.save.done", locale, {
        path: result.result.path,
        title: result.result.title
      })
    ]
  }
  if (result.code === "not_scriptable") {
    return [
      tCmd("cmd.snapshot.save.notHttp", locale, {
        url: result.url ?? "(no url)"
      })
    ]
  }
  const lines = [tCmd("cmd.snapshot.save.failed", locale, { message: result.message })]
  if (result.code === "empty_body") {
    lines.push(tCmd("cmd.snapshot.save.reloadAdvice", locale))
  }
  return lines
}
