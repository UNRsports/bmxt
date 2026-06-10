import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { formatMessage } from "./format-message.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))
const MESSAGES = JSON.parse(
  readFileSync(join(__dirname, "messages.json"), "utf8")
) as Record<string, Partial<Record<"ja" | "en", string>>>

describe("formatMessage", () => {
  it("replaces placeholders", () => {
    assert.equal(formatMessage("pair {pairToken}", { pairToken: "--ja-en" }), "pair --ja-en")
  })
})

describe("messages.json", () => {
  it("pairs ja and en for shell.welcome", () => {
    const entry = MESSAGES["shell.welcome"]
    assert.equal(entry?.ja, "BMXtへようこそ！本プログラムはテストバージョンです。")
    assert.equal(entry?.en, "Welcome to BMXt! This program is a test version.")
  })

  it("supports version placeholder", () => {
    const template = MESSAGES["versionUpgrade.title"]?.en ?? ""
    assert.equal(formatMessage(template, { version: "0.4.7" }), "◆Version upgrade — 0.4.7")
  })

  it("pairs ja and en for help.title and prompt.placeholder", () => {
    assert.equal(MESSAGES["help.title"]?.ja, "BMXt - ブラウザコマンドシェル")
    assert.equal(MESSAGES["help.title"]?.en, "BMXt - browser command shell")
    assert.equal(MESSAGES["prompt.placeholder"]?.ja, "入力するか TAB キーで補完")
    assert.equal(MESSAGES["prompt.placeholder"]?.en, "type or use TAB key")
  })
})
