/**
 * EN: Factory for per-browser WXT configs.
 * WXT `root` is always `shared/` (entrypoints/public/lib). Host dirs only hold config + AMO kit.
 * JA: ブラウザ別 WXT 設定。WXT root は常に `shared/`。hosts は設定と AMO キットのみ。
 */

import { readFileSync } from "node:fs"
import { defineConfig } from "wxt"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  FIREFOX_ANDROID_STRICT_MIN_VERSION,
  FIREFOX_GECKO_ID,
  FIREFOX_STRICT_MIN_VERSION,
  firefoxHostPermissionManifestExtras,
  HOST_ORIGIN_PERMISSIONS,
  hostCommands,
  hostContentSecurityPolicy,
  hostIcons,
  hostPermissionsList,
  type HostBrowser
} from "./manifest-base"

const hostsDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(hostsDir, "..")
const sharedDir = join(repoRoot, "shared")
const nodeEmptyShim = join(sharedDir, "lib/shims/node-empty.ts")

function readExtensionVersion(): string {
  const raw = readFileSync(join(repoRoot, "package.json"), "utf8")
  const pkg = JSON.parse(raw) as { version?: unknown }
  if (typeof pkg.version === "string" && pkg.version.length > 0) {
    return pkg.version
  }
  return "0.0.0"
}

export function createHostWxtConfig(browser: HostBrowser) {
  const extensionVersion = readExtensionVersion()
  // EN: AMO requires gecko.data_collection_permissions for new extensions
  //     (Nov 2025+). BMXt keeps data local (storage / UI memory) and does not
  //     transmit outside the extension — declare required: ["none"].
  //     Key name is data_collection_permissions (AMO UI may say "policy").
  // JA: 新規拡張は data_collection_permissions 必須。BMXt は外部送信なし → none。
  const manifestExtra =
    browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: FIREFOX_GECKO_ID,
              strict_min_version: FIREFOX_STRICT_MIN_VERSION,
              data_collection_permissions: {
                required: ["none"]
              }
            },
            gecko_android: {
              strict_min_version: FIREFOX_ANDROID_STRICT_MIN_VERSION
            }
          },
          ...firefoxHostPermissionManifestExtras()
        }
      : {}

  return defineConfig({
    modules: ["@wxt-dev/module-react"],
    // Entrypoints must live under WXT root — use shared/ as the extension source root.
    root: sharedDir,
    outDir: join(repoRoot, ".output"),
    // EN: Stable zip names — `.output/bmxt-<version>-chrome.zip` / `…-firefox.zip`
    //     (not package.json `bmxt_demo` → bmxtdemo).
    zip: {
      name: "bmxt",
      artifactTemplate: "{{name}}-{{version}}-{{browser}}.zip",
      // EN: Do not emit WXT's incomplete Firefox sources.zip — `package:firefox`
      //     writes a full AMO tarball via hosts/firefox/scripts/package-amo-source.mjs.
      // JA: WXT の不完全な sources.zip は出さない。審査用は package:firefox 側で作る。
      zipSources: false
    },
    // Firefox defaults to MV2 unless forced; both store targets are MV3.
    manifestVersion: 3,
    vite: () => ({
      server: {
        fs: {
          allow: [repoRoot]
        }
      },
      resolve: {
        alias: {
          fs: nodeEmptyShim,
          path: nodeEmptyShim,
          crypto: nodeEmptyShim
        }
      },
      plugins: [
        {
          // EN: WXT background builds set inlineDynamicImports (no manualChunks).
          //     Apply feature splits only to multi-chunk UI / content builds.
          // JA: background は inlineDynamicImports のため manualChunks 不可。
          //     UI など複数 chunk ビルドにだけ feature 分割を適用する。
          name: "bmxt-split-large-feature-chunks",
          outputOptions(options) {
            if (options.inlineDynamicImports) {
              return options
            }
            return {
              ...options,
              manualChunks(id) {
                const normalized = id.replace(/\\/g, "/")
                if (normalized.includes("/node_modules/")) {
                  if (
                    normalized.includes("/react-dom/") ||
                    normalized.includes("/scheduler/") ||
                    /\/react\//.test(normalized)
                  ) {
                    return "vendor-react"
                  }
                  return "vendor"
                }
                if (normalized.includes("/lib/features/setting/i18n/")) {
                  return "feature-i18n"
                }
                // EN: sync/tabs/search/side-picker cross-import; one chunk avoids circular splits.
                // JA: sync/tabs/search/side-picker は相互 import するため同一 chunk にまとめる。
                if (
                  normalized.includes("/lib/features/sync/") ||
                  normalized.includes("/lib/features/tabs/") ||
                  normalized.includes("/lib/features/side-picker/") ||
                  normalized.includes("/lib/features/search/")
                ) {
                  return "feature-browser"
                }
                return undefined
              }
            }
          }
        }
      ],
      build: {
        // EN: Keep the Rollup size warning; feature chunks above keep each file under it.
        // JA: サイズ警告閾値は維持。上記 feature 分割で各ファイルを閾値未満に保つ。
        chunkSizeWarningLimit: 700
      }
    }),
    manifest: {
      name: "__MSG_extensionName__",
      description: "__MSG_extensionDescription__",
      version: extensionVersion,
      default_locale: "en",
      permissions: hostPermissionsList(browser),
      // EN: https for in-page scripting; loopback door port for CLI sealed handshake only (todo §11).
      host_permissions: [...HOST_ORIGIN_PERMISSIONS],
      content_security_policy: hostContentSecurityPolicy(browser),
      commands: hostCommands(browser),
      action: {
        default_icon: hostIcons
      },
      icons: hostIcons,
      ...manifestExtra
    }
  })
}
