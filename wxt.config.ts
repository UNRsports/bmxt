import { createRequire } from "node:module"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "wxt"

const require = createRequire(fileURLToPath(import.meta.url))
const { createLogger } = require(
  require.resolve("vite", { paths: [dirname(require.resolve("wxt"))] })
) as typeof import("vite")

const viteLogger = createLogger()
const viteLoggerInfo = viteLogger.info
const viteLoggerWarn = viteLogger.warn

function isSqlJsBrowserExternalizeMessage(message: string): boolean {
  return (
    message.includes("externalized for browser compatibility") &&
    message.includes("sql.js")
  )
}

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  react: {
    vite: {
      jsxRuntime: "automatic"
    }
  },
  vite: () => ({
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react"
    },
    build: {
      chunkSizeWarningLimit: 2048
    },
    customLogger: {
      ...viteLogger,
      info(message, options) {
        if (isSqlJsBrowserExternalizeMessage(message)) {
          return
        }
        viteLoggerInfo(message, options)
      },
      warn(message, options) {
        if (isSqlJsBrowserExternalizeMessage(message)) {
          return
        }
        viteLoggerWarn(message, options)
      }
    }
  }),
  manifest: {
    name: "__MSG_extensionName__",
    description: "__MSG_extensionDescription__",
    default_locale: "en",
    action: {},
    permissions: [
      "favicon",
      "tabs",
      "tabGroups",
      "storage",
      "unlimitedStorage",
      "windows",
      "scripting",
      "history",
      "bookmarks"
    ],
    optional_host_permissions: ["http://*/*", "https://*/*"],
    web_accessible_resources: [
      {
        resources: ["assets/search-cache/*"],
        matches: ["<all_urls>"]
      }
    ],
    content_security_policy: {
      extension_pages:
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self';"
    },
    commands: {
      "launch-bmxt": {
        suggested_key: {
          default: "Shift+Alt+C",
          mac: "Shift+Alt+C"
        },
        description: "__MSG_commandLaunchBmxt__",
        global: true
      },
      "reset-bmxt": {
        suggested_key: {
          default: "Shift+Alt+R",
          mac: "Shift+Alt+R"
        },
        description: "__MSG_commandResetBmxt__",
        global: true
      }
    }
  }
})
