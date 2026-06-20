import { memo } from "react"
import { TerminalLogLines } from "../terminal-log-lines"
import {
  formatBulletedLines,
  versionUpgradeTitle,
  type useUiCopy
} from "../../setting"
import type { PostUpgradeBanner } from "../use-version-upgrade-banner"

type Props = {
  lines: string[]
  postUpgradeBanner: PostUpgradeBanner | null
  uiCopy: ReturnType<typeof useUiCopy>
}

export const BmxtTerminalScrollPane = memo(function BmxtTerminalScrollPane({
  lines,
  postUpgradeBanner,
  uiCopy
}: Props) {
  return (
    <>
      {lines.length === 0 || postUpgradeBanner ? (
        <div className="bmxt-hint">
          {uiCopy.t("shell.welcome")}
          <br />
          <br />
          {uiCopy.t("shell.helpHint")}
        </div>
      ) : null}
      {postUpgradeBanner ? (
        <div className="bmxt-version-upgrade">
          <div className="bmxt-version-upgrade-title">
            {versionUpgradeTitle(uiCopy.locale, postUpgradeBanner.version)}
          </div>
          <div className="bmxt-version-upgrade-notes">
            {formatBulletedLines(postUpgradeBanner, uiCopy.locale).map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      ) : null}
      {lines.length > 0 ? <TerminalLogLines lines={lines} /> : null}
    </>
  )
})
