import {
  getWelcomeContentForVersion,
  listWelcomeContentVersions,
  placeholderWelcomeContent,
  resolveWelcomeImageUrl
} from "./welcome-content"
import {
  isRenderableWelcomeImagePath,
  resolveHeroImageMaxWidthCss
} from "./welcome-image-paths"
import { resolveWelcomeDisplayVersion } from "./welcome-version-resolve"
import { CSP_DYNAMIC_SCOPE_ATTR, useCspDynamicStyle } from "../bmxt-window/csp-dynamic-stylesheet"
import { useId } from "react"

function listAdditionalImagePaths(
  entry: { heroImage?: string; additionalImages?: string[] }
): string[] {
  const paths: string[] = []
  for (const path of entry.additionalImages ?? []) {
    if (isRenderableWelcomeImagePath(path)) {
      paths.push(path)
    }
  }
  return paths
}

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
  const heroPath = isRenderableWelcomeImagePath(entry.heroImage)
    ? entry.heroImage
    : null
  const heroMaxWidth = resolveHeroImageMaxWidthCss(entry.heroImageMaxWidth)
  const heroScopeId = useId()
  useCspDynamicStyle(
    heroPath && heroMaxWidth ? heroScopeId : null,
    heroMaxWidth ? { maxWidth: heroMaxWidth } : null
  )
  const additionalImagePaths = listAdditionalImagePaths(entry)

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
          {heroPath || additionalImagePaths.length > 0 ? (
            <div className="bmxt-welcome__images" aria-label="welcome images">
              {heroPath ? (
                <figure className="bmxt-welcome__hero-figure">
                  <img
                    className="bmxt-welcome__hero-image"
                    {...(heroMaxWidth ? { [CSP_DYNAMIC_SCOPE_ATTR]: heroScopeId } : {})}
                    src={resolveWelcomeImageUrl(heroPath)}
                    alt="Welcome hero image"
                    loading="eager"
                  />
                </figure>
              ) : null}
              {additionalImagePaths.map((path, i) => (
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
