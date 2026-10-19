import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { formatMessage } from "../../../../../lib/features/setting/i18n/format-message.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadNamespaceMessages(): Record<string, Partial<Record<"ja" | "en", string>>> {
  const dir = join(__dirname, "..", "..", "..", "..", "..", "lib", "features", "setting", "i18n", "namespaces")
  const merged: Record<string, Partial<Record<"ja" | "en", string>>> = {}
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json") || file.startsWith("_")) {
      continue
    }
    const part = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<
      string,
      Partial<Record<"ja" | "en", string>>
    >
    Object.assign(merged, part)
  }
  return merged
}

describe("formatMessage", () => {
  it("replaces placeholders", () => {
    assert.equal(formatMessage("pair {pairToken}", { pairToken: "--ja-en" }), "pair --ja-en")
  })
})

describe("namespace message catalogs", () => {
  const messages = loadNamespaceMessages()

  it("loads 762 keys across namespace JSON files", () => {
    assert.equal(Object.keys(messages).length, 762)
  })

  it("pairs ja and en for shell.welcome", () => {
    const entry = messages["shell.welcome"]
    assert.equal(entry?.ja, "BMXtへようこそ！本プログラムはテストバージョンです。")
    assert.equal(entry?.en, "Welcome to BMXt! This program is a test version.")
  })

  it("pairs ja and en for shell.reloadHint", () => {
    const entry = messages["shell.reloadHint"]
    assert.equal(
      entry?.ja,
      "⚠️サイト内操作は https タブへ自動注入されます。平文 http・chrome://・休止中のタブなどでは使えません。⚠️"
    )
    assert.equal(
      entry?.en,
      "⚠️ In-page actions inject into https tabs automatically. Plain http, chrome://, discarded tabs, and other restricted pages cannot be scripted. ⚠️"
    )
  })

  it("supports version placeholder", () => {
    const template = messages["versionUpgrade.title"]?.en ?? ""
    assert.equal(formatMessage(template, { version: "0.4.7" }), "◆Version upgrade — 0.4.7")
  })

  it("pairs ja and en for help.title and prompt.placeholder", () => {
    assert.equal(messages["help.title"]?.ja, "BMXt - ブラウザコマンドシェル")
    assert.equal(messages["help.title"]?.en, "BMXt - browser command shell")
    assert.equal(messages["prompt.placeholder"]?.ja, "入力するか TAB キーで補完")
    assert.equal(messages["prompt.placeholder"]?.en, "type or use TAB key")
  })

  it("pads setting -list | browse notice with blank lines above and below", () => {
    assert.equal(
      messages["setting.list.notice.useBrowse"]?.ja,
      "設定の変更には下記コマンドを使用してください。"
    )
    assert.equal(
      messages["setting.list.notice.useBrowse"]?.en,
      "To change settings, use the command below."
    )
  })
})
