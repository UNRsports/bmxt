import "../../bmxt-ui.css"

/**
 * EN: Float host page — same shell as the popup window, independent process UI.
 *     Boots only after SW validates parent-frame origin (WAR embed gate).
 * JA: フロート用ページ。ポップアップと同じシェルを独立プロセスとして載せる。
 *     親フレーム origin の SW 認可後にのみ起動（WAR 埋め込みゲート）。
 */
import {
  installPageBootPerfConsoleHelpers,
  markPageBootPhase,
  resetPageBootPerf
} from "../../lib/features/launch/page-boot-perf"
import { startVersionUpgradePreflight } from "../../lib/features/bmxt-window/version-upgrade-preflight"
import {
  BMXT_FLOAT_BOOT_AUTH_TYPE,
  readFloatParentOriginFromAncestors,
  type BmxtFloatBootAuthResponse
} from "../../lib/features/bmxt-float/float-boot-auth-message"
import { tFloatHost } from "../../lib/features/setting/i18n/ns/float-host"
import { DEFAULT_UI_LOCALE } from "../../lib/features/setting/locale"

document.documentElement.classList.add("bmxt-float-page")

resetPageBootPerf()
installPageBootPerfConsoleHelpers()
markPageBootPhase("page-script-start")
startVersionUpgradePreflight()

void (async () => {
  const rootEl = document.getElementById("root")
  if (!rootEl) {
    return
  }

  const coreReady = import("../../lib/features/bmxt-core")

  const [
    { createRoot },
    { useEffect, useMemo, useState },
    { BmxtTerminal },
    { UiSettingsProvider, useUiSettings }
  ] = await Promise.all([
    import("react-dom/client"),
    import("react"),
    import("../../lib/features/bmxt-window/bmxt-terminal"),
    import("../../lib/features/setting/use-ui-settings")
  ])

  markPageBootPhase("react-chunks-loaded")
  await coreReady
  markPageBootPhase("bmxt-core-ready")
  markPageBootPhase("react-render-start")

  type BootAuthState = "pending" | "ok" | "denied"

  function BmxtFloatPage() {
    const { settings: uiSettings } = useUiSettings()
    const locale = uiSettings.locale ?? DEFAULT_UI_LOCALE
    const floatTabId = useMemo(() => {
      try {
        const raw = new URLSearchParams(window.location.search).get("tabId")
        if (raw === null || raw.length === 0) {
          return null
        }
        const parsed = Number(raw)
        if (!Number.isInteger(parsed) || parsed < 0) {
          return null
        }
        return parsed
      } catch {
        return null
      }
    }, [])
    const [bootAuth, setBootAuth] = useState<BootAuthState>("pending")

    useEffect(() => {
      document.title = "BMXt Float"
    }, [])

    useEffect(() => {
      let cancelled = false
      if (floatTabId === null) {
        setBootAuth("denied")
        return
      }
      const parentOrigin = readFloatParentOriginFromAncestors(window.location.ancestorOrigins)
      void chrome.runtime
        .sendMessage({
          type: BMXT_FLOAT_BOOT_AUTH_TYPE,
          tabId: floatTabId,
          parentOrigin
        })
        .then((raw: unknown) => {
          if (cancelled) {
            return
          }
          const response = raw as BmxtFloatBootAuthResponse | undefined
          setBootAuth(response?.ok === true ? "ok" : "denied")
        })
        .catch(() => {
          if (!cancelled) {
            setBootAuth("denied")
          }
        })
      return () => {
        cancelled = true
      }
    }, [floatTabId])

    if (bootAuth === "pending") {
      return (
        <div className="bmxt-float-boot-gate" role="status">
          {tFloatHost("floatHost.bootPending", locale)}
        </div>
      )
    }
    if (bootAuth === "denied") {
      return (
        <div className="bmxt-float-boot-gate" role="alert">
          <p className="bmxt-float-boot-gate-title">{tFloatHost("floatHost.bootDenied.title", locale)}</p>
          <p className="bmxt-float-boot-gate-body">{tFloatHost("floatHost.bootDenied.body", locale)}</p>
        </div>
      )
    }

    return <BmxtTerminal hostKind="float" floatTabId={floatTabId} />
  }

  createRoot(rootEl).render(
    <UiSettingsProvider>
      <BmxtFloatPage />
    </UiSettingsProvider>
  )
})()
