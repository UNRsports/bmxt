import {
  getWelcomeContentForVersion,
  placeholderWelcomeContent,
  resolveWelcomeImageUrl
} from "./welcome-content"

export function WelcomePage() {
  const version = chrome.runtime.getManifest().version
  const entry = getWelcomeContentForVersion(version) ?? placeholderWelcomeContent()
  const imagePaths = [
    ...(entry.heroImage ? [entry.heroImage] : []),
    ...(entry.additionalImages ?? [])
  ]

  return (
    <main className="bmxt-welcome">
      <div className="bmxt-welcome__card">
        <h1 className="bmxt-welcome__title">Welcome to BMXt</h1>
        <p className="bmxt-welcome__subtitle">
          This page appears once after each extension update.
        </p>
        <p className="bmxt-welcome__subtitle">
          拡張機能アップデート後、初回のみこのページを表示しています。
        </p>

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
                  <figcaption className="bmxt-welcome__image-caption">{path}</figcaption>
                </figure>
              ))}
            </div>
          ) : null}
          <div className="bmxt-welcome__notes">
            <h3 className="bmxt-welcome__lang">[ja]</h3>
            <ul>
              {entry.ja.map((line, i) => (
                <li key={`ja-${i}`}>{line}</li>
              ))}
            </ul>
            <h3 className="bmxt-welcome__lang">[en]</h3>
            <ul>
              {entry.en.map((line, i) => (
                <li key={`en-${i}`}>{line}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  )
}
