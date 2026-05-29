import {
  getWelcomeContentForVersion,
  listWelcomeContentVersions,
  listWelcomeImagePaths,
  placeholderWelcomeContent,
  resolveWelcomeImageUrl
} from "./welcome-content"
import { resolveWelcomeDisplayVersion } from "./welcome-version-resolve"

export function WelcomePage() {
  const manifestVersion = chrome.runtime.getManifest().version
  const params =
    typeof location !== "undefined"
      ? new URLSearchParams(location.search)
      : new URLSearchParams()
  const { version, fromUrlQuery } = resolveWelcomeDisplayVersion(
    params,
    manifestVersion,
    listWelcomeContentVersions()
  )
  const entry = getWelcomeContentForVersion(version) ?? placeholderWelcomeContent()
  const imagePaths = listWelcomeImagePaths(entry)

  return (
    <main className="bmxt-welcome">
      <div className="bmxt-welcome__card">
        <h1 className="bmxt-welcome__title">Welcome to BMXt</h1>
        {fromUrlQuery ? (
          <>
            <p className="bmxt-welcome__subtitle">
              Preview: welcome content for <code>?version={version}</code> (URL query).
            </p>
            <p className="bmxt-welcome__subtitle">
              プレビュー: URL の <code>?version={version}</code> で指定した版のウェルカム内容を表示しています。
            </p>
          </>
        ) : null}

        <section className="bmxt-welcome__section">
          <h2 className="bmxt-welcome__heading">Version {version}</h2>
          {imagePaths.length > 0 ? (
            <div className="bmxt-welcome__images" aria-label="welcome images">
              {imagePaths.map((path, i) => (
                <figure key={`${path}-${i}`} className="bmxt-welcome__image-figure">
                  <img
                    className="bmxt-welcome__image"
                    src={resolveWelcomeImageUrl(path)}
                    alt={`Welcome image ${i + 1}`}
                    loading="lazy"
                  />
                </figure>
              ))}
            </div>
          ) : null}
          <div className="bmxt-welcome__notes">
            <h3 className="bmxt-welcome__lang">[en]</h3>
            <ul>
              {entry.en.map((line, i) => (
                <li key={`en-${i}`}>{line}</li>
              ))}
            </ul>
            <h3 className="bmxt-welcome__lang">[ja]</h3>
            <ul>
              {entry.ja.map((line, i) => (
                <li key={`ja-${i}`}>{line}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  )
}
