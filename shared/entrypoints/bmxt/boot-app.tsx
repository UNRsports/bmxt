/**
 * EN: Full shell mount for `bmxt.html`.
 * JA: bmxt.html 用のシェル本体マウント。
 */
import { createRoot } from "react-dom/client"
import { useEffect } from "react"
import {
  installPageBootPerfConsoleHelpers,
  markPageBootPhase,
  resetPageBootPerf
} from "../../lib/features/launch/page-boot-perf"
import { startVersionUpgradePreflight } from "../../lib/features/bmxt-window/version-upgrade-preflight"
import { installPopupShellUnloadNotify } from "../../lib/features/bmxt-window/popup-shell-unload"
import { installPopupWindowBoundsPersist } from "../../lib/features/bmxt-window/window-bounds"
import { BmxtTerminal } from "../../lib/features/bmxt-window/bmxt-terminal"

export function bootBmxtShell(): void {
  resetPageBootPerf()
  installPageBootPerfConsoleHelpers()
  markPageBootPhase("page-script-start")
  startVersionUpgradePreflight()
  installPopupWindowBoundsPersist()
  installPopupShellUnloadNotify()

  const rootEl = document.getElementById("root")
  if (!rootEl) {
    throw new Error("missing #root")
  }

  markPageBootPhase("react-chunks-loaded")
  markPageBootPhase("bmxt-core-ready")
  markPageBootPhase("react-render-start")

  function BmxtTabPage() {
    useEffect(() => {
      const title = chrome.i18n.getMessage("extensionName")
      if (title) {
        document.title = title
      }
    }, [])

    return <BmxtTerminal hostKind="popup" />
  }

  createRoot(rootEl).render(<BmxtTabPage />)
}
