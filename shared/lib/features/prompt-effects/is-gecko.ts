/**
 * EN: True on Firefox/Gecko — prompt-fire is smooth on Chromium with the menu open;
 *     menu-open jank is Gecko-only, so menu-lite applies only here.
 * JA: Firefox/Gecko 判定。Chrome はメニュー開でも問題なし。menu-lite は Gecko のみ。
 */
export function isGeckoPromptEffectHost(): boolean {
  if (typeof navigator === "undefined") {
    return false
  }
  return /Firefox\//.test(navigator.userAgent)
}
