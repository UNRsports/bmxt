import { useEffect } from "react"

/** capture フェーズで window の keydown を拾う（子の textarea より先に処理する） */
export function useWindowKeydownCapture(handler: (ev: KeyboardEvent) => void) {
  useEffect(() => {
    window.addEventListener("keydown", handler, true)
    return () => window.removeEventListener("keydown", handler, true)
  }, [handler])
}
