import "../bmxt-ui.css"

import { BmxtTerminal } from "../lib/features/bmxt-window/bmxt-terminal"
import { useEffect } from "react"

export default function BmxtTabPage() {
  useEffect(() => {
    const title = chrome.i18n.getMessage("extensionName")
    if (title) {
      document.title = title
    }
  }, [])

  return <BmxtTerminal />
}
