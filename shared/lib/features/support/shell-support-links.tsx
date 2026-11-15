import type { MouseEvent } from "react"
import { tShell } from "../setting/i18n/ns/shell"
import type { UiLocale } from "../setting/locale"
import {
  openSupportLinkInTab,
  SUPPORT_MANUAL_NOTEBOOK_URL,
  SUPPORT_OFFICIAL_SITE_URL,
  type SupportLinkUrl
} from "./support-urls"

type ShellSupportLinksProps = {
  locale: UiLocale
}

function onSupportLinkClick(url: SupportLinkUrl, e: MouseEvent<HTMLAnchorElement>): void {
  e.preventDefault()
  void openSupportLinkInTab(url)
}

/** EN: Welcome-area support links (friendly labels; open in a normal browser tab). */
export function ShellSupportLinks({ locale }: ShellSupportLinksProps) {
  return (
    <>
      <a
        href={SUPPORT_OFFICIAL_SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          onSupportLinkClick(SUPPORT_OFFICIAL_SITE_URL, e)
        }}>
        {tShell("shell.support.officialSite", locale)}
      </a>
      <br />
      <a
        href={SUPPORT_MANUAL_NOTEBOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          onSupportLinkClick(SUPPORT_MANUAL_NOTEBOOK_URL, e)
        }}>
        {tShell("shell.support.manualNotebook", locale)}
      </a>
    </>
  )
}
