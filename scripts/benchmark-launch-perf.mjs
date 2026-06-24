#!/usr/bin/env node
/**
 * EN: Benchmark cold SW launch path (unit tests + built bundle checks).
 * JA: 冷起動ショートカット向けベンチ（単体テスト + ビルド検証）。
 *
 * Usage: pnpm run build && node scripts/benchmark-launch-perf.mjs
 */

import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const outDir = path.join(root, ".output/chrome-mv3")
const backgroundPath = path.join(outDir, "background.js")

function runLaunchUnitTests() {
  console.log("== launch unit tests ==")
  execSync(
    "node --experimental-strip-types --test lib/features/launch/launch-perf.test.ts lib/features/launch/page-boot-perf.test.ts",
    { cwd: root, stdio: "inherit" }
  )
}

function verifyBuiltBackground() {
  console.log("\n== built background checks ==")
  if (!fs.existsSync(backgroundPath)) {
    console.error("Missing", backgroundPath, "— run pnpm run build first")
    process.exit(1)
  }
  const servicesPath = path.join(outDir, "background-services.js")
  if (!fs.existsSync(servicesPath)) {
    console.error("Missing", servicesPath, "— run node scripts/build-background-services.mjs")
    process.exit(1)
  }
  const bg = fs.readFileSync(backgroundPath, "utf8")
  const services = fs.readFileSync(servicesPath, "utf8")
  const shellRequired = [
    "bmxt_launch_perf",
    "[bmxt perf copy]",
    "shortcut-received",
    "create-window-start",
    "create-window-done",
    "launch-chain-done",
    "background-services.js",
    "RUN_CMD"
  ]
  const shellMissing = shellRequired.filter((token) => !bg.includes(token))
  if (shellMissing.length > 0) {
    console.error("background.js missing expected tokens:", shellMissing.join(", "))
    process.exit(1)
  }
  if (bg.includes("runDispatch")) {
    console.error("background.js still bundles runDispatch — split background-services")
    process.exit(1)
  }
  if (!services.includes("registerBackgroundServices")) {
    console.error("background-services.js missing registerBackgroundServices")
    process.exit(1)
  }
  if (services.includes("sql.js") || services.includes("initSqlJs")) {
    console.error("background-services.js still bundles sql.js — remove SQLite from SW")
    process.exit(1)
  }
  console.log("background.js size KB:", Math.round(bg.length / 1024))
  console.log(
    "background-services.js size KB:",
    Math.round(services.length / 1024)
  )
  console.log("launch perf instrumentation: OK")
}

function printChromeMeasurementHint() {
  console.log("\n== Chrome measurement ==")
  console.log(
    "1. Load .output/chrome-mv3 unpacked, open chrome://extensions → Service Worker → Inspect"
  )
  console.log("2. Terminate SW, press Shift+Alt+C (launch-bmxt)")
  console.log("3. Console shows: [bmxt perf copy] sw-launch: {...}")
  console.log("4. Page DevTools: [bmxt perf copy] page-boot: {...} (after prompt appears)")
  console.log("5. chrome.storage.session.get(['bmxt_launch_perf','bmxt_page_boot_perf'])")
  console.log("6. Page DevTools: bmxtPerfReport() — re-print combined JSON")
  console.log("   focus path: phases.create-window-done absent; focus-window-done set")
  console.log("   cold open:  create-window-done ≈ time to window visible from SW")
}

async function main() {
  runLaunchUnitTests()
  verifyBuiltBackground()
  printChromeMeasurementHint()
}

await main()
