import { useEffect } from "react"

import { WelcomePage } from "../lib/features/welcome"
import "../lib/features/welcome/welcome-page.css"

export default function WelcomeTabPage() {
  useEffect(() => {
    document.title = "BMXt - Welcome"
  }, [])

  return <WelcomePage />
}
