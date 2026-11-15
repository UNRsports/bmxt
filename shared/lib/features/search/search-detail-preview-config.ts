/**
 * EN: Detail auto preview debounce (ms). Longer than the shared picker default (100)
 *     so rapid j/k does not stack full Range collects before the session is warm.
 * JA: 詳細 auto の debounce。結果一覧の共有既定（100）より長くし、温まる前の連打を抑える。
 */
export const SEARCH_DETAIL_AUTO_PREVIEW_DEBOUNCE_MS = 180

/** EN: Shared picker alt-preview debounce used for detail `--manual` Alt sync. */
export const SEARCH_DETAIL_MANUAL_PREVIEW_DEBOUNCE_MS = 100
