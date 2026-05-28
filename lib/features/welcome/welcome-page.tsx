import { getReleaseNotesForVersion, placeholderTexts } from "../release-notes"

export function WelcomePage() {
  const version = chrome.runtime.getManifest().version
  const entry = getReleaseNotesForVersion(version) ?? placeholderTexts()

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
