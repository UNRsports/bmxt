import { looksLikeBraveSync } from "../../setting/detect-brave"
import { tCmd } from "../../setting/i18n/ns/cmd"
import type { UiLocale } from "../../setting/locale"

/**
 * EN: Map sync facade machine tokens to bilingual log lines.
 * JA: facade の機械トークンを二言語ログ行へ展開。
 */
export function expandSyncLogToken(token: string, locale: UiLocale): string {
  if (token === "sync.dir.cancelled") {
    return tCmd("cmd.sync.dir.cancelled", locale)
  }
  if (token.startsWith("sync.dir.error:")) {
    const code = token.slice("sync.dir.error:".length)
    if (code === "unavailable") {
      if (looksLikeBraveSync()) {
        return tCmd("cmd.sync.dir.unavailableBrave", locale)
      }
      return tCmd("cmd.sync.dir.unavailable", locale)
    }
    if (code === "gesture_required") {
      return tCmd("cmd.sync.dir.gestureRequired", locale)
    }
    if (code === "permission_denied") {
      return tCmd("cmd.sync.dir.permissionDenied", locale)
    }
    return tCmd("cmd.sync.dir.error", locale, { code })
  }
  if (token.startsWith("sync.dir.ok:")) {
    const name = token.slice("sync.dir.ok:".length)
    return tCmd("cmd.sync.dir.ok", locale, { name })
  }
  if (token === "sync.pair.created") {
    return tCmd("cmd.sync.pair.created", locale)
  }
  if (token === "sync.pair.noFamily") {
    return tCmd("cmd.sync.pair.noFamily", locale)
  }
  if (token === "sync.pair.invalidInvite") {
    return tCmd("cmd.sync.pair.invalidInvite", locale)
  }
  if (token === "sync.pair.joinFailed") {
    return tCmd("cmd.sync.pair.joinFailed", locale)
  }
  if (token.startsWith("sync.pair.invite:")) {
    return tCmd("cmd.sync.pair.invite", locale, { invite: token.slice("sync.pair.invite:".length) })
  }
  if (token.startsWith("sync.pair.qr:")) {
    return tCmd("cmd.sync.pair.qr", locale, { payload: token.slice("sync.pair.qr:".length) })
  }
  if (token.startsWith("sync.pair.joined:")) {
    return tCmd("cmd.sync.pair.joined", locale, { familyId: token.slice("sync.pair.joined:".length) })
  }
  if (token.startsWith("sync.pair.peer:")) {
    return tCmd("cmd.sync.pair.peer", locale, { name: token.slice("sync.pair.peer:".length) })
  }
  if (token === "sync.members.header") {
    return tCmd("cmd.sync.members.header", locale)
  }
  if (token === "sync.members.empty") {
    return tCmd("cmd.sync.members.empty", locale)
  }
  if (token.startsWith("sync.members.row:")) {
    const [name, deviceId, browser, updatedAt] = token.slice("sync.members.row:".length).split("|")
    return tCmd("cmd.sync.members.row", locale, {
      name: name ?? "",
      deviceId: deviceId ?? "",
      browser: browser ?? "",
      updatedAt: updatedAt ?? ""
    })
  }
  if (token.startsWith("sync.members.discovered:")) {
    const [name, deviceId, source] = token.slice("sync.members.discovered:".length).split("|")
    return tCmd("cmd.sync.members.discovered", locale, {
      name: name ?? "",
      deviceId: deviceId ?? "",
      source: source ?? ""
    })
  }
  if (token.startsWith("sync.pull.done:")) {
    return tCmd("cmd.sync.pull.done", locale, { detail: token.slice("sync.pull.done:".length) })
  }
  if (token.startsWith("sync.push.done:")) {
    return tCmd("cmd.sync.push.done", locale, { detail: token.slice("sync.push.done:".length) })
  }
  if (token === "sync.pause.on") {
    return tCmd("cmd.sync.pause.on", locale)
  }
  if (token === "sync.pause.off") {
    return tCmd("cmd.sync.pause.off", locale)
  }
  if (token === "sync.open.noUrls") {
    return tCmd("cmd.sync.open.noUrls", locale)
  }
  if (token.startsWith("sync.open.done:")) {
    return tCmd("cmd.sync.open.done", locale, { detail: token.slice("sync.open.done:".length) })
  }
  if (token.startsWith("sync.connect.state:")) {
    return tCmd("cmd.sync.connect.state", locale, { state: token.slice("sync.connect.state:".length) })
  }
  if (token.startsWith("sync.connect.ping:")) {
    return tCmd("cmd.sync.connect.ping", locale, { detail: token.slice("sync.connect.ping:".length) })
  }
  if (token === "sync.name.invalid") {
    return tCmd("cmd.sync.name.invalid", locale)
  }
  if (token.startsWith("sync.name.ok:")) {
    return tCmd("cmd.sync.name.ok", locale, { name: token.slice("sync.name.ok:".length) })
  }
  return token
}

export function expandSyncLogLines(tokens: string[], locale: UiLocale): string[] {
  return tokens.map((t) => expandSyncLogToken(t, locale))
}
