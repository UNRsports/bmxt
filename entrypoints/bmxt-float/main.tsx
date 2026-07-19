import "../../bmxt-ui.css"

/**
 * EN: Float host page — same shell as the popup window, independent process UI.
 * JA: フロート用ページ。ポップアップと同じシェルを独立プロセスとして載せる。
 */
import {
  installPageBootPerfConsoleHelpers,
  markPageBootPhase,
  resetPageBootPerf
} from "../../lib/features/launch/page-boot-perf"
import { startVersionUpgradePreflight } from "../../lib/features/bmxt-window/version-upgrade-preflight"

document.documentElement.classList.add("bmxt-float-page")

resetPageBootPerf()
installPageBootPerfConsoleHelpers()
markPageBootPhase("page-script-start")
startVersionUpgradePreflight()

void (async () => {
  const rootEl = document.getElementById("root")
  if (!rootEl) {
    return
  }

  const coreReady = import("../../lib/features/bmxt-core")

  const [{ createRoot }, { useEffect }, { BmxtTerminal }] = await Promise.all([
    import("react-dom/client"),
    import("react"),
    import("../../lib/features/bmxt-window/bmxt-terminal")
  ])

  markPageBootPhase("react-chunks-loaded")
  await coreReady
  markPageBootPhase("bmxt-core-ready")
  markPageBootPhase("react-render-start")

  function BmxtFloatPage() {
    useEffect(() => {
      document.title = "BMXt Float"
    }, [])

    return <BmxtTerminal hostKind="float" />
  }

  createRoot(rootEl).render(<BmxtFloatPage />)
})()
