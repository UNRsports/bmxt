import "../../bmxt-ui.css"

import { BmxtTerminal } from "../../lib/features/bmxt-window/bmxt-terminal"
import { useEffect } from "react"
import { createRoot } from "react-dom/client"

function BmxtTabPage() {
  useEffect(() => {
    const title = chrome.i18n.getMessage("extensionName")
    if (title) {
      document.title = title
    }
  }, [])

  return <BmxtTerminal />
}

const rootEl = document.getElementById("root")
if (rootEl) {
  createRoot(rootEl).render(<BmxtTabPage />)
}
