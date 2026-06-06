import { NavStatusBar } from "../nav"
import type { TranslationPairId } from "../translate/translation-pair"
import { TranslateStatusBar } from "../translate/translate-status-bar"
import { TabsStatusBar } from "../tabs/tabs-status-bar"
import type { TabsPageActiveMode } from "../tabs/page-active-setting"
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
  pairId: TranslationPairId
  enabled: boolean
  navTypingAssist: boolean
  navTypingMultiline: boolean
  busy: boolean
  statusNote: string | null
}

type TabsProps = {
  pickerOpen: boolean
  pageActiveMode: TabsPageActiveMode
}

type Props = {
  order: readonly ModeToolbarId[]
  nav: NavProps
  translate: TranslateProps
  tabs: TabsProps
}

export function ModeStatusBarStack({ order, nav, translate, tabs }: Props) {
  const rows = order.flatMap((id) => {
    if (id === "tabs") {
      if (!tabs.pickerOpen) {
        return []
      }
      return [<TabsStatusBar key="tabs" pageActiveMode={tabs.pageActiveMode} />]
    }
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
        pairId={translate.pairId}
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
