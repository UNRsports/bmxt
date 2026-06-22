import { defineConfig } from "wxt"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const nodeEmptyShim = join(dirname(fileURLToPath(import.meta.url)), "lib/shims/node-empty.ts")

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
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
    default_locale: "en",
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
    content_security_policy: {
      extension_pages:
        "default-src 'self'; script-src 'self'; object-src 'self'; connect-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self';"
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
    },
    action: {
      default_icon: {
        16: "icon.png",
        32: "icon.png",
        48: "icon.png",
        128: "icon.png"
      }
    },
    icons: {
      16: "icon.png",
      32: "icon.png",
      48: "icon.png",
      128: "icon.png"
    }
  }
})
