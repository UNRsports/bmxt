import { defineConfig, devices } from "@playwright/test"

/**
 * EN: Extension E2E — Chromium persistent context + loaded unpacked build.
 * JA: 拡張 E2E — Chromium 永続コンテキストにアンパックビルドをロード。
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 15_000
  },
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    trace: "on-first-retry"
  }
})
