/**
 * EN: Firefox install smoke — temporary addon loads (RDP via playwright-webextext).
 * JA: Firefox インストール煙テスト — 一時アドオンが載ること（playwright-webextext + RDP）。
 *
 * EN: Does not open `bmxt.html`: Playwright’s Firefox cannot drive `moz-extension://`
 * (microsoft/playwright#7297). Shell UI e2e stays on Chromium (`prompt-cjk.spec.ts`).
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  expect,
  firefoxExtensionPath,
  isFirefoxE2e,
  readGeckoId,
  test
} from "./fixtures.ts"

const describeFirefox = isFirefoxE2e() ? test.describe : test.describe.skip

describeFirefox("firefox temporary addon install", () => {
  test("records gecko id UUID and opens welcome on install", async ({
    context,
    extensionId,
    firefoxUserDataDir
  }) => {
    expect(firefoxUserDataDir, "persistent profile").toBeTruthy()
    const geckoId = readGeckoId(firefoxExtensionPath())
    expect(geckoId).toBe("bmxt@unrsports")
    expect(extensionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )

    const prefsPath = join(firefoxUserDataDir!, "prefs.js")
    expect(existsSync(prefsPath)).toBe(true)
    const prefs = readFileSync(prefsPath, "utf8")
    expect(prefs).toContain("bmxt@unrsports")
    expect(prefs).toContain(extensionId)

    const extPrefsPath = join(firefoxUserDataDir!, "extension-preferences.json")
    expect(existsSync(extPrefsPath)).toBe(true)
    const extPrefs = JSON.parse(readFileSync(extPrefsPath, "utf8")) as Record<
      string,
      { origins?: string[] }
    >
    expect(extPrefs[geckoId]?.origins ?? []).toContain("https://*/*")

    // EN: openWelcomeOnUpdate opens the public welcome page after install.
    await expect
      .poll(
        () =>
          context.pages().some((p) => {
            try {
              return /unrsports\.github\.io\/bmxt\/welcome\.html/i.test(p.url())
            } catch {
              return false
            }
          }),
        { timeout: 30_000 }
      )
      .toBe(true)
  })
})
