import { tCmd } from "../../setting/i18n/ns/cmd"
import type { UiLocale } from "../../setting/locale"

/**
 * EN: Map sync facade machine tokens to bilingual log lines.
 * JA: facade の機械トークンを二言語ログ行へ展開。
 */
export function expandSyncLogToken(token: string, locale: UiLocale): string {
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
  if (token === "sync.rtc.offerCreated") {
    return tCmd("cmd.sync.rtc.offerCreated", locale)
  }
  if (token === "sync.rtc.answerCreated") {
    return tCmd("cmd.sync.rtc.answerCreated", locale)
  }
  if (token === "sync.rtc.encodeFailed") {
    return tCmd("cmd.sync.rtc.encodeFailed", locale)
  }
  if (token === "sync.rtc.invalidCode") {
    return tCmd("cmd.sync.rtc.invalidCode", locale)
  }
  if (token === "sync.rtc.familyMismatch") {
    return tCmd("cmd.sync.rtc.familyMismatch", locale)
  }
  if (token === "sync.rtc.acceptFailed") {
    return tCmd("cmd.sync.rtc.acceptFailed", locale)
  }
  if (token === "sync.rtc.wrongAddressee") {
    return tCmd("cmd.sync.rtc.wrongAddressee", locale)
  }
  if (token.startsWith("sync.rtc.code:")) {
    return tCmd("cmd.sync.rtc.code", locale, { code: token.slice("sync.rtc.code:".length) })
  }
  if (token.startsWith("sync.rtc.peer:")) {
    return tCmd("cmd.sync.rtc.peer", locale, { name: token.slice("sync.rtc.peer:".length) })
  }
  if (token.startsWith("sync.rtc.connected:")) {
    return tCmd("cmd.sync.rtc.connected", locale, { name: token.slice("sync.rtc.connected:".length) })
  }
  if (token === "sync.rtc.pingDeferred") {
    return tCmd("cmd.sync.rtc.pingDeferred", locale)
  }
  if (token === "sync.open.noUrls") {
    return tCmd("cmd.sync.open.noUrls", locale)
  }
  if (token === "sync.open.notConnected") {
    return tCmd("cmd.sync.open.notConnected", locale)
  }
  if (token.startsWith("sync.open.done:")) {
    return tCmd("cmd.sync.open.done", locale, { detail: token.slice("sync.open.done:".length) })
  }
  if (token === "sync.list.noConnectedPeers") {
    return tCmd("cmd.sync.list.noConnectedPeers", locale)
  }
  if (token.startsWith("sync.list.peerFailed:")) {
    const rest = token.slice("sync.list.peerFailed:".length)
    const split = rest.indexOf(":")
    const deviceId = split >= 0 ? rest.slice(0, split) : rest
    const detail = split >= 0 ? rest.slice(split + 1) : ""
    return tCmd("cmd.sync.list.peerFailed", locale, { deviceId, detail })
  }
  if (token.startsWith("sync.connect.state:")) {
    return tCmd("cmd.sync.connect.state", locale, { state: token.slice("sync.connect.state:".length) })
  }
  if (token.startsWith("sync.connect.ping:")) {
    return tCmd("cmd.sync.connect.ping", locale, { detail: token.slice("sync.connect.ping:".length) })
  }
  if (token === "sync.connect.badDeviceId") {
    return tCmd("cmd.sync.connect.badDeviceId", locale)
  }
  if (token === "sync.connect.unknownMember") {
    return tCmd("cmd.sync.connect.unknownMember", locale)
  }
  if (token.startsWith("sync.connect.role:")) {
    return tCmd("cmd.sync.connect.role", locale, {
      role: token.slice("sync.connect.role:".length)
    })
  }
  if (token.startsWith("sync.connect.peer:")) {
    return tCmd("cmd.sync.connect.peer", locale, {
      detail: token.slice("sync.connect.peer:".length)
    })
  }
  if (token === "sync.connect.waitOffer") {
    return tCmd("cmd.sync.connect.waitOffer", locale)
  }
  if (token === "sync.connect.copyThenWaitAnswer") {
    return tCmd("cmd.sync.connect.copyThenWaitAnswer", locale)
  }
  if (token === "sync.connect.copyThenWaitPeerAccept") {
    return tCmd("cmd.sync.connect.copyThenWaitPeerAccept", locale)
  }
  if (token === "sync.connect.pasteAtPrompt") {
    return tCmd("cmd.sync.connect.pasteAtPrompt", locale)
  }
  if (token === "sync.connect.copied") {
    return tCmd("cmd.sync.connect.copied", locale)
  }
  if (token === "sync.connect.copyIdle") {
    return tCmd("cmd.sync.connect.copyIdle", locale)
  }
  if (token === "sync.connect.clipboardWriteFailed") {
    return tCmd("cmd.sync.connect.clipboardWriteFailed", locale)
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
