#!/usr/bin/env node
/**
 * EN: Benchmark cold SW launch path (unit scheduler + built bundle checks).
 * JA: 冷起動ショートカット向けベンチ（スケジューラ単体 + ビルド検証）。
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
    "node --experimental-strip-types --test lib/features/launch/launch-perf.test.ts lib/features/launch/warm-search-scheduler.test.ts",
    { cwd: root, stdio: "inherit" }
  )
}

function verifyBuiltBackground() {
  console.log("\n== built background checks ==")
  if (!fs.existsSync(backgroundPath)) {
    console.error("Missing", backgroundPath, "— run pnpm run build first")
    process.exit(1)
  }
  const bg = fs.readFileSync(backgroundPath, "utf8")
  const required = [
    "bmxt_launch_perf",
    "[bmxt launch perf]",
    "shortcut-received",
    "create-window-done",
    "launch-chain-done"
  ]
  const missing = required.filter((token) => !bg.includes(token))
  if (missing.length > 0) {
    console.error("background.js missing expected tokens:", missing.join(", "))
    process.exit(1)
  }
  console.log("background.js size KB:", Math.round(bg.length / 1024))
  console.log("launch perf instrumentation: OK")
}

function simulateStorageContention() {
  console.log("\n== simulated storage contention (ms) ==")
  const storageDelayMs = 12
  let storageQueue = Promise.resolve()

  function storageGet(label) {
    const start = performance.now()
    storageQueue = storageQueue.then(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(Math.round(performance.now() - start))
          }, storageDelayMs)
        })
    )
    return storageQueue
  }

  async function oldColdOpen() {
    const t0 = performance.now()
    await storageGet("resolve-window")
    await storageGet("ensure-sessions")
    await storageGet("create-window-persist")
    return Math.round(performance.now() - t0)
  }

  async function newColdOpen() {
    const t0 = performance.now()
    await storageGet("resolve-window")
    await storageGet("create-window-persist")
    return Math.round(performance.now() - t0)
  }

  async function oldWithWarmRace() {
    const t0 = performance.now()
    void storageGet("warm-sql-open")
    void storageGet("warm-history-persist")
    await storageGet("resolve-window")
    await storageGet("ensure-sessions")
    await storageGet("create-window-persist")
    return Math.round(performance.now() - t0)
  }

  async function newWithDeferredWarm() {
    const t0 = performance.now()
    await storageGet("resolve-window")
    await storageGet("create-window-persist")
    setTimeout(() => {
      void storageGet("warm-sql-open")
      void storageGet("warm-history-persist")
    }, 400)
    return Math.round(performance.now() - t0)
  }

  return Promise.all([
    oldColdOpen(),
    newColdOpen(),
    oldWithWarmRace(),
    newWithDeferredWarm()
  ]).then(([oldOpen, newOpen, oldRace, newDefer]) => {
    console.log("cold open (no warm race):  old ~", oldOpen, "ms  new ~", newOpen, "ms")
    console.log(
      "with warm competing:       old ~",
      oldRace,
      "ms  new (deferred) ~",
      newDefer,
      "ms"
    )
    console.log(
      "estimated shortcut win (contended): ~",
      Math.max(0, oldRace - newDefer),
      "ms"
    )
  })
}

function printChromeMeasurementHint() {
  console.log("\n== Chrome measurement ==")
  console.log(
    "1. Load .output/chrome-mv3 unpacked, open chrome://extensions → Service Worker → Inspect"
  )
  console.log("2. Terminate SW, press Shift+Alt+C (launch-bmxt)")
  console.log("3. Console shows: [bmxt launch perf] { phases, launchChainMs }")
  console.log("4. chrome.storage.session.get('bmxt_launch_perf') for last snapshot")
  console.log("   focus path: phases.create-window-done absent; focus-window-done set")
  console.log("   cold open:  create-window-done ≈ time to window visible from SW")
}

async function main() {
  runLaunchUnitTests()
  verifyBuiltBackground()
  await simulateStorageContention()
  printChromeMeasurementHint()
}

await main()
