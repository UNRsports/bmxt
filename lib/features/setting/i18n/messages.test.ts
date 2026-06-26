import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { formatMessage } from "./format-message.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadNamespaceMessages(): Record<string, Partial<Record<"ja" | "en", string>>> {
  const dir = join(__dirname, "namespaces")
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

  it("loads 553 keys across namespace JSON files", () => {
    assert.equal(Object.keys(messages).length, 553)
  })

  it("pairs ja and en for shell.welcome", () => {
    const entry = messages["shell.welcome"]
    assert.equal(entry?.ja, "BMXtへようこそ！本プログラムはテストバージョンです。")
    assert.equal(entry?.en, "Welcome to BMXt! This program is a test version.")
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
})
