import { NavStatusBar } from "../nav"
import { TranslateStatusBar } from "../translate/translate-status-bar"
import type { ModeToolbarId } from "./mode-toolbar-order"

type NavProps = {
  armed: boolean
  active: boolean
  typingMode: boolean
  typingMultiline: boolean
  menuOpen: boolean
  textSelPhase: "start" | "end" | "done" | "idle" | null
  tabTitle: string | null
  overlayError: string | null
}

type TranslateProps = {
  enabled: boolean
  editorOpen: boolean
  editorFocused: boolean
  navTypingAssist: boolean
  navTypingMultiline: boolean
  busy: boolean
  statusNote: string | null
}

type Props = {
  order: readonly ModeToolbarId[]
  nav: NavProps
  translate: TranslateProps
}

export function ModeStatusBarStack({ order, nav, translate }: Props) {
  const rows = order.flatMap((id) => {
    if (id === "nav") {
      if (!nav.armed) {
        return []
      }
      return [
        <NavStatusBar
          key="nav"
          armed={nav.armed}
          active={nav.active}
          typingMode={nav.typingMode}
          typingMultiline={nav.typingMultiline}
          menuOpen={nav.menuOpen}
          textSelPhase={nav.textSelPhase}
          tabTitle={nav.tabTitle}
          overlayError={nav.overlayError}
        />
      ]
    }
    if (!translate.enabled) {
      return []
    }
    return [
      <TranslateStatusBar
        key="translate"
        editorOpen={translate.editorOpen}
        editorFocused={translate.editorFocused}
        navTypingAssist={translate.navTypingAssist}
        navTypingMultiline={translate.navTypingMultiline}
        busy={translate.busy}
        statusNote={translate.statusNote}
      />
    ]
  })

  if (rows.length === 0) {
    return null
  }

  return <div className="bmxt-mode-status-stack">{rows}</div>
}
