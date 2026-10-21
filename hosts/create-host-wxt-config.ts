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
          }
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
      artifactTemplate: "{{name}}-{{version}}-{{browser}}.zip"
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
      build: {
        chunkSizeWarningLimit: 700
      }
    }),
    manifest: {
      name: "__MSG_extensionName__",
      description: "__MSG_extensionDescription__",
      version: extensionVersion,
      default_locale: "en",
      permissions: hostPermissionsList(browser),
      host_permissions: ["https://*/*"],
      content_security_policy: hostContentSecurityPolicy(browser),
      commands: hostCommands(browser),
      web_accessible_resources: [
        {
          resources: ["bmxt-float.html"],
          matches: ["https://*/*"]
        }
      ],
      action: {
        default_icon: hostIcons
      },
      icons: hostIcons,
      ...manifestExtra
    }
  })
}
