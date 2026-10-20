import { defineConfig, devices } from "@playwright/test"

/**
 * EN: Extension E2E — Chromium or Firefox persistent context + loaded unpacked build.
 * JA: 拡張 E2E — Chromium / Firefox 永続コンテキストにアンパックビルドをロード。
 * Browser: `BMXT_E2E_BROWSER=chrome|firefox` (see `tests/e2e/fixtures.ts`).
 * Requires Playwright Firefox ≥139 (matches hosts `strict_min_version`); use `@playwright/test` ≥1.54.
 */
export default defineConfig({
  testDir: "./e2e",
  // EN: Keep artifacts under tests/ (not repo root).
  // JA: 成果物はリポジトリ直下ではなく tests/ 配下へ。
  outputDir: "./test-results",
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
