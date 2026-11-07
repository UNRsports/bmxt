import { tCmd } from "../../setting/i18n/ns/cmd"
import type { UiLocale } from "../../setting/locale"
import type { SyncStatusSnapshot } from "../types"

export function formatSyncStatusLines(status: SyncStatusSnapshot, locale: UiLocale): string[] {
  const lines: string[] = []
  lines.push(
    tCmd("cmd.sync.status.device", locale, {
      name: status.device.displayName,
      deviceId: status.device.deviceId,
      browser: status.device.browser
    })
  )
  if (status.family) {
    lines.push(
      tCmd("cmd.sync.status.family", locale, {
        familyId: status.family.familyId
      })
    )
  } else {
    lines.push(tCmd("cmd.sync.status.noFamily", locale))
  }
  lines.push(
    tCmd("cmd.sync.status.workdir", locale, {
      enabled: status.workdir.enabled ? "yes" : "no",
      paused: status.workdir.paused ? "yes" : "no",
      directory: status.workdir.directoryName ?? "-",
      lastPull: status.workdir.lastPullAt ?? "-",
      lastPush: status.workdir.lastPushAt ?? "-"
    })
  )
  lines.push(
    tCmd("cmd.sync.status.membersCount", locale, {
      count: String(status.members.length)
    })
  )
  if (status.connections.length === 0) {
    lines.push(tCmd("cmd.sync.status.connectionsEmpty", locale))
  } else {
    for (const c of status.connections) {
      lines.push(
        tCmd("cmd.sync.status.connection", locale, {
          deviceId: c.deviceId,
          state: c.state
        })
      )
    }
  }
  if (status.invite) {
    lines.push(tCmd("cmd.sync.status.inviteHint", locale))
  }
  lines.push(tCmd("cmd.sync.status.transportHint", locale))
  return lines
}
