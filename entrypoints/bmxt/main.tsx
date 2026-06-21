import "../../bmxt-ui.css"

/**
 * EN: Static HTML paints first; then load React shell + command core in parallel.
 * JA: 静的 HTML を即表示し、React とコマンドコアを並列読み込み。
 */
import { warmBackgroundServicesFromPageAsync } from "../../lib/features/launch/warm-background-services"

void warmBackgroundServicesFromPageAsync()

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

  await coreReady

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
