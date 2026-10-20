/**
 * EN: Shared path helpers for host WXT configs and root build scripts.
 * JA: ホスト WXT 設定とルートビルドスクリプト向けの共通パス。
 */

import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const hostsDir = dirname(fileURLToPath(import.meta.url))

export const repoRoot = join(hostsDir, "..")
export const sharedDir = join(repoRoot, "shared")
export const sharedLibDir = join(sharedDir, "lib")
export const sharedCratesDir = join(sharedDir, "crates")
export const sharedManifestDir = join(sharedDir, "manifest")
export const sharedEntrypointsDir = join(sharedDir, "entrypoints")
export const sharedPublicDir = join(sharedDir, "public")
export const sharedShimPath = join(sharedLibDir, "shims", "node-empty.ts")
export const outputDir = join(repoRoot, ".output")
