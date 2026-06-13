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
import { pickUiLines, useUiCopy } from "../setting"
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
  const uiCopy = useUiCopy()
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
  const noteLines = pickUiLines(entry, uiCopy.locale)

  return (
    <main className="bmxt-welcome">
      <div className="bmxt-welcome__card">
        <h1 className="bmxt-welcome__title">{uiCopy.t("welcome.pageTitle")}</h1>
        {fromUrlQuery ? (
          <p className="bmxt-welcome__subtitle">
            {uiCopy.t("welcome.previewSubtitle")} <code>?version={version}</code>{" "}
            {uiCopy.t("welcome.previewSuffix")}
          </p>
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
            <ul>
              {noteLines.map((line, i) => (
                <li key={`${uiCopy.locale}-${i}`}>{line}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  )
}
