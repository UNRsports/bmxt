import "../../bmxt-ui.css"

import { useEffect } from "react"
import { createRoot } from "react-dom/client"
import { BmxtTerminal } from "../../lib/features/bmxt-window/bmxt-terminal"

function BmxtTabPage() {
  useEffect(() => {
    const title = chrome.i18n.getMessage("extensionName")
    if (title) {
      document.title = title
    }
  }, [])

  return <BmxtTerminal />
}

const root = document.getElementById("root")
if (root) {
  createRoot(root).render(<BmxtTabPage />)
}
