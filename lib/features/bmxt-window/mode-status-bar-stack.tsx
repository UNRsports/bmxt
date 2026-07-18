import type { ReactNode } from "react"
import { DomStatusBar } from "../dom/dom-status-bar"
import { NavStatusBar } from "../nav"
import { SearchStatusBar } from "../search/search-status-bar"
import type { SearchPageActiveMode } from "../search/page-active-setting"
import { SettingStatusBar } from "../setting/setting-status-bar"
import type { TranslationPairId } from "../translate/translation-pair"
import { TranslateStatusBar } from "../translate/translate-status-bar"
import { TabsStatusBar } from "../tabs/tabs-status-bar"
import type { TabsPageActiveMode } from "../tabs/page-active-setting"
import type { DomPageActiveMode } from "../dom/page-active-setting"
import type { DetailBarId } from "./detail-bar-focus"
import type { ModeToolbarId } from "./mode-toolbar-order"

type NavProps = {
  armed: boolean
  active: boolean
  typingMode: boolean
  typingMultiline: boolean
  menuOpen: boolean
  textSelPhase: "start" | "end" | "done" | "idle" | null
  jumpMode?: boolean
  jumpQuery?: string
  jumpMatchCount?: number
  targetLabel?: string | null
  activateError?: string | null
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

type SearchProps = {
  pickerOpen: boolean
  pattern?: string
  phase?: "loading" | "results"
  pageActiveMode: SearchPageActiveMode
}

type DomProps = {
  pickerOpen: boolean
  kind: "lines" | "prompt"
  pageActiveMode: DomPageActiveMode
}

type SettingProps = {
  pickerOpen: boolean
}

type Props = {
  order: readonly ModeToolbarId[]
  focusedDetailBarId: DetailBarId | null
  detailBarFocusActive: boolean
  nav: NavProps
  translate: TranslateProps
  tabs: TabsProps
  search: SearchProps
  dom: DomProps
  setting: SettingProps
}

function wrapDetailBar(
  id: DetailBarId,
  focusedDetailBarId: DetailBarId | null,
  detailBarFocusActive: boolean,
  node: ReactNode
): ReactNode {
  const focused = detailBarFocusActive && focusedDetailBarId === id
  return (
    <div
      key={id}
      className={`bmxt-mode-status-row${focused ? " bmxt-mode-status-row--focused" : ""}`}
      data-detail-bar-id={id}>
      {node}
    </div>
  )
}

export function ModeStatusBarStack({
  order,
  focusedDetailBarId,
  detailBarFocusActive,
  nav,
  translate,
  tabs,
  search,
  dom,
  setting
}: Props) {
  const rows = order.flatMap((id) => {
    if (id === "tabs") {
      if (!tabs.pickerOpen) {
        return []
      }
      return [
        wrapDetailBar(
          "tabs",
          focusedDetailBarId,
          detailBarFocusActive,
          <TabsStatusBar pageActiveMode={tabs.pageActiveMode} />
        )
      ]
    }
    if (id === "search") {
      if (!search.pickerOpen) {
        return []
      }
      return [
        wrapDetailBar(
          "search",
          focusedDetailBarId,
          detailBarFocusActive,
          <SearchStatusBar
            pattern={search.pattern}
            phase={search.phase}
            pageActiveMode={search.pageActiveMode}
          />
        )
      ]
    }
    if (id === "dom") {
      if (!dom.pickerOpen) {
        return []
      }
      return [
        wrapDetailBar(
          "dom",
          focusedDetailBarId,
          detailBarFocusActive,
          <DomStatusBar kind={dom.kind} pageActiveMode={dom.pageActiveMode} />
        )
      ]
    }
    if (id === "setting") {
      if (!setting.pickerOpen) {
        return []
      }
      return [
        wrapDetailBar(
          "setting",
          focusedDetailBarId,
          detailBarFocusActive,
          <SettingStatusBar />
        )
      ]
    }
    if (id === "nav") {
      if (!nav.armed) {
        return []
      }
      return [
        wrapDetailBar(
          "nav",
          focusedDetailBarId,
          detailBarFocusActive,
          <NavStatusBar
            armed={nav.armed}
            active={nav.active}
            typingMode={nav.typingMode}
            typingMultiline={nav.typingMultiline}
            menuOpen={nav.menuOpen}
            textSelPhase={nav.textSelPhase}
            jumpMode={nav.jumpMode}
            jumpQuery={nav.jumpQuery}
            jumpMatchCount={nav.jumpMatchCount}
            targetLabel={nav.targetLabel}
            activateError={nav.activateError}
            tabTitle={nav.tabTitle}
            overlayError={nav.overlayError}
          />
        )
      ]
    }
    if (!translate.enabled) {
      return []
    }
    return [
      wrapDetailBar(
        "translate",
        focusedDetailBarId,
        detailBarFocusActive,
        <TranslateStatusBar
          pairId={translate.pairId}
          navTypingAssist={translate.navTypingAssist}
          navTypingMultiline={translate.navTypingMultiline}
          busy={translate.busy}
          statusNote={translate.statusNote}
        />
      )
    ]
  })

  if (rows.length === 0) {
    return null
  }

  return <div className="bmxt-mode-status-stack">{rows}</div>
}
