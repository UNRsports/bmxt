import { useEffect, useState } from "react"
import { LAST_SEEN_EXTENSION_VERSION_KEY } from "../extension-storage/keys"
import {
  getReleaseNotesForVersion,
  type ReleaseNotesEntry
} from "./release-notes"

export type PostUpgradeBanner = ReleaseNotesEntry & {
  version: string
}

/**
 * マニフェストのバージョンが前回起動時から変わっていれば一度だけバナー用データを返す。
 * 表示後、`LAST_SEEN_EXTENSION_VERSION_KEY` を現在バージョンに更新する。
 *
 * `ready` が true になるまで UI でログのみ先に出すなどのちらつきを避ける用途。
 */
export function useVersionUpgradeBanner(): {
  postUpgradeBanner: PostUpgradeBanner | null
  upgradeBannerReady: boolean
} {
  const [banner, setBanner] = useState<PostUpgradeBanner | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const v = chrome.runtime.getManifest().version
    chrome.storage.local.get(LAST_SEEN_EXTENSION_VERSION_KEY, (r) => {
      if (chrome.runtime.lastError) {
        setReady(true)
        return
      }
      const last = r[LAST_SEEN_EXTENSION_VERSION_KEY] as string | undefined
      if (last === v) {
        setBanner(null)
        setReady(true)
        return
      }
      const entry = getReleaseNotesForVersion(v)
      setBanner({
        version: v,
        ja: entry?.ja ??
          "（このバージョンのリリースノートは未登録です。lib/features/bmxt-window/release-notes.json にエントリを追加してください。）",
        en: entry?.en ??
          "(No release notes for this version. Add an entry to lib/features/bmxt-window/release-notes.json.)"
      })
      void chrome.storage.local.set({ [LAST_SEEN_EXTENSION_VERSION_KEY]: v })
      setReady(true)
    })
  }, [])

  return { postUpgradeBanner: banner, upgradeBannerReady: ready }
}
