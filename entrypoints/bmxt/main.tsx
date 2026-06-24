import "../../bmxt-ui.css"

/**
 * EN: Static HTML paints first; then load React shell + command core in parallel.
 * JA: 静的 HTML を即表示し、React とコマンドコアを並列読み込み。
 */
import {
  installPageBootPerfConsoleHelpers,
  markPageBootPhase,
  resetPageBootPerf
} from "../../lib/features/launch/page-boot-perf"
import { startVersionUpgradePreflight } from "../../lib/features/bmxt-window/version-upgrade-preflight"

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

  function BmxtTabPage() {
    useEffect(() => {
      const title = chrome.i18n.getMessage("extensionName")
      if (title) {
        document.title = title
      }
    }, [])

    return <BmxtTerminal />
  }

  createRoot(rootEl).render(<BmxtTabPage />)
})()
