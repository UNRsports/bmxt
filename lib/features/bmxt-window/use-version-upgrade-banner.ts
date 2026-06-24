import { useEffect, useState } from "react"
import { LAST_SEEN_EXTENSION_VERSION_KEY } from "../extension-storage/keys"
import {
  getReleaseNotesForVersion,
  placeholderTexts,
  type ReleaseNotesEntry
} from "../release-notes"
import { readVersionUpgradePreflightAsync } from "./version-upgrade-preflight"

export type PostUpgradeBanner = ReleaseNotesEntry & {
  version: string
}

/**
 * マニフェストのバージョンが前回起動時から変わっていれば一度だけバナー用データを返す。
 * 表示後、`LAST_SEEN_EXTENSION_VERSION_KEY` を現在バージョンに更新する。
 *
 * `upgradeBannerReady` はログ領域のウェルカム／バナー表示待ち用。
 * プロンプト操作可能かどうかには使わない（storage 待ちで入力をブロックしない）。
 */
export function useVersionUpgradeBanner(): {
  postUpgradeBanner: PostUpgradeBanner | null
  upgradeBannerReady: boolean
} {
  const [banner, setBanner] = useState<PostUpgradeBanner | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const version = chrome.runtime.getManifest().version

    void readVersionUpgradePreflightAsync().then((stored) => {
      if (cancelled) {
        return
      }
      const last = stored[LAST_SEEN_EXTENSION_VERSION_KEY] as string | undefined
      if (last === version) {
        setBanner(null)
        setReady(true)
        return
      }
      const entry = getReleaseNotesForVersion(version)
      const ph = placeholderTexts()
      setBanner({
        version,
        ja: entry?.ja ?? ph.ja,
        en: entry?.en ?? ph.en
      })
      void chrome.storage.local.set({ [LAST_SEEN_EXTENSION_VERSION_KEY]: version })
      setReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { postUpgradeBanner: banner, upgradeBannerReady: ready }
}
