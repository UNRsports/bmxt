import { UI_SETTINGS_KEY } from "../extension-storage/keys"
import {
  DEFAULT_UI_APPEARANCE,
  normalizeUiAppearance,
  type UiAppearance
} from "./appearance"
import {
  DEFAULT_HOST_UI_MODE,
  normalizeHostUiMode,
  type HostUiMode
} from "./host-ui-mode.ts"
import { formatUiSettingsSummaryLines } from "./i18n/resolvers"
import {
  DEFAULT_UI_LOCALE,
  parseUiLocale,
  type UiLocale
} from "./locale"
import {
  DEFAULT_SEARCH_LEGEND_MODE,
  normalizeSearchLegendMode,
  type SearchLegendMode
} from "./search-legend-mode.ts"
import {
  activateInternalUiSettingsStorage,
  clearExternalUiSettingsStorage,
  loadUiSettingsFromDirectory,
  tryLoadUiSettingsFromExternal,
  trySaveUiSettingsToExternal
} from "./settings-external-storage"
import {
  DEFAULT_CLI_DOOR_RETRY_MS,
  DEFAULT_SYNC_HOLD_INTERVAL_MS,
  normalizeSyncTimingMs
} from "./sync-timing.ts"

/** EN: Default on — show usage help beside IME candidate tokens. */
export const DEFAULT_IME_CANDIDATE_HELP = true

/** EN: Default off — opt-in prompt typing fire particles. */
export const DEFAULT_PROMPT_FIRE = false

export type UiSettings = {
  locale: UiLocale
  appearance: UiAppearance
  /**
   * EN: Host UI form factor preference.
   *     `auto` → Android mobile, else desktop; override with `desktop` / `mobile`.
   */
  hostUiMode: HostUiMode
  /**
   * EN: When true, IME token picker shows usage help in a right-hand column.
   * JA: true のとき候補メニュー右に usage ヘルプ列を表示。
   */
  imeCandidateHelp: boolean
  /**
   * EN: When true, typed prompt chars get fire wrap; deleted chars glitter-shatter.
   * JA: true のとき入力は炎ラップ、削除はキラキラ砕け散り。
   */
  promptFire: boolean
  /**
   * EN: Search picker / `search -list` scope legend style (text / emoji / both).
   * JA: 検索ピッカーおよび `search -list` のスコープ凡例表示（テキスト／絵文字／併用）。
   */
  searchLegendMode: SearchLegendMode
  /**
   * EN: Sync tunnel hold tick interval (ms) while the prompt window is open.
   * JA: プロンプト窓オープン中の Sync トンネル hold 間隔（ミリ秒）。
   */
  syncHoldIntervalMs: number
  /**
   * EN: CLI localhost door reconnect retry interval (ms).
   * JA: CLI localhost door 再接続リトライ間隔（ミリ秒）。
   */
  cliDoorRetryMs: number
}

function pickImeCandidateHelpFromPartial(raw: Record<string, unknown>): boolean {
  if (!("imeCandidateHelp" in raw)) {
    return DEFAULT_IME_CANDIDATE_HELP
  }
  return raw.imeCandidateHelp !== false
}

function pickPromptFireFromPartial(raw: Record<string, unknown>): boolean {
  if (!("promptFire" in raw)) {
    return DEFAULT_PROMPT_FIRE
  }
  return raw.promptFire === true
}

function pickSearchLegendModeFromPartial(raw: Record<string, unknown>): SearchLegendMode {
  if (!("searchLegendMode" in raw)) {
    return DEFAULT_SEARCH_LEGEND_MODE
  }
  return normalizeSearchLegendMode(raw.searchLegendMode)
}

function pickSyncHoldIntervalMsFromPartial(raw: Record<string, unknown>): number {
  if (!("syncHoldIntervalMs" in raw)) {
    return DEFAULT_SYNC_HOLD_INTERVAL_MS
  }
  return normalizeSyncTimingMs(raw.syncHoldIntervalMs, DEFAULT_SYNC_HOLD_INTERVAL_MS)
}

function pickCliDoorRetryMsFromPartial(raw: Record<string, unknown>): number {
  if (!("cliDoorRetryMs" in raw)) {
    return DEFAULT_CLI_DOOR_RETRY_MS
  }
  return normalizeSyncTimingMs(raw.cliDoorRetryMs, DEFAULT_CLI_DOOR_RETRY_MS)
}

function pickHostUiModeFromPartial(raw: Record<string, unknown>): HostUiMode {
  if ("hostUiMode" in raw) {
    return normalizeHostUiMode(raw.hostUiMode)
  }
  // EN: Migrate early 0.8.2 local `extraKeysMode` (on/off/auto).
  if ("extraKeysMode" in raw) {
    return normalizeHostUiMode(raw.extraKeysMode)
  }
  return DEFAULT_HOST_UI_MODE
}

/** EN: Normalize partial storage / import objects (backward compatible). */
export function normalizeUiSettings(raw: Partial<UiSettings> | null | undefined): UiSettings {
  if (!raw || typeof raw !== "object") {
    return {
      locale: DEFAULT_UI_LOCALE,
      appearance: normalizeUiAppearance(null),
      hostUiMode: DEFAULT_HOST_UI_MODE,
      imeCandidateHelp: DEFAULT_IME_CANDIDATE_HELP,
      promptFire: DEFAULT_PROMPT_FIRE,
      searchLegendMode: DEFAULT_SEARCH_LEGEND_MODE,
      syncHoldIntervalMs: DEFAULT_SYNC_HOLD_INTERVAL_MS,
      cliDoorRetryMs: DEFAULT_CLI_DOOR_RETRY_MS
    }
  }
  const record = raw as Record<string, unknown>
  return {
    locale: parseUiLocale(raw.locale),
    appearance: normalizeUiAppearance(raw.appearance),
    hostUiMode: pickHostUiModeFromPartial(record),
    imeCandidateHelp: pickImeCandidateHelpFromPartial(record),
    promptFire: pickPromptFireFromPartial(record),
    searchLegendMode: pickSearchLegendModeFromPartial(record),
    syncHoldIntervalMs: pickSyncHoldIntervalMsFromPartial(record),
    cliDoorRetryMs: pickCliDoorRetryMsFromPartial(record)
  }
}

async function loadUiSettingsFromChromeStorage(): Promise<UiSettings> {
  const r = await chrome.storage.local.get(UI_SETTINGS_KEY)
  const raw = r[UI_SETTINGS_KEY]
  if (!raw || typeof raw !== "object") {
    return normalizeUiSettings(null)
  }
  return normalizeUiSettings(raw as Partial<UiSettings>)
}

export async function loadUiSettingsInternalCache(): Promise<UiSettings> {
  return loadUiSettingsFromChromeStorage()
}

export async function resetUiSettingsToDefaultsAndInternal(): Promise<UiSettings> {
  const defaults = normalizeUiSettings({
    locale: DEFAULT_UI_LOCALE,
    appearance: DEFAULT_UI_APPEARANCE,
    hostUiMode: DEFAULT_HOST_UI_MODE,
    imeCandidateHelp: DEFAULT_IME_CANDIDATE_HELP,
    promptFire: DEFAULT_PROMPT_FIRE,
    searchLegendMode: DEFAULT_SEARCH_LEGEND_MODE
  })
  await saveUiSettingsToChromeStorage(defaults)
  await activateInternalUiSettingsStorage()
  await clearExternalUiSettingsStorage()
  return defaults
}

export async function mirrorUiSettingsToInternalCache(next: UiSettings): Promise<void> {
  await saveUiSettingsToChromeStorage(normalizeUiSettings(next))
}

export async function applyDefaultUiSettingsToInternalCache(): Promise<UiSettings> {
  const defaults = normalizeUiSettings({
    locale: DEFAULT_UI_LOCALE,
    appearance: DEFAULT_UI_APPEARANCE,
    hostUiMode: DEFAULT_HOST_UI_MODE,
    imeCandidateHelp: DEFAULT_IME_CANDIDATE_HELP,
    promptFire: DEFAULT_PROMPT_FIRE,
    searchLegendMode: DEFAULT_SEARCH_LEGEND_MODE
  })
  await saveUiSettingsToChromeStorage(defaults)
  return defaults
}

export async function loadUiSettings(): Promise<UiSettings> {
  const external = await tryLoadUiSettingsFromExternal()
  if (external) {
    await mirrorUiSettingsToInternalCache(external)
    return external
  }
  return loadUiSettingsFromChromeStorage()
}

async function saveUiSettingsToChromeStorage(next: UiSettings): Promise<void> {
  await chrome.storage.local.set({
    [UI_SETTINGS_KEY]: next satisfies UiSettings
  })
}

async function saveUiSettings(next: UiSettings): Promise<{ externalWriteFailed: boolean }> {
  const normalized = normalizeUiSettings(next)
  await saveUiSettingsToChromeStorage(normalized)
  try {
    await trySaveUiSettingsToExternal(normalized)
    return { externalWriteFailed: false }
  } catch {
    return { externalWriteFailed: true }
  }
}

export async function saveUiLocale(locale: UiLocale): Promise<void> {
  const current = await loadUiSettings()
  await saveUiSettings({ ...current, locale })
}

export async function saveUiAppearancePatch(patch: Partial<UiAppearance>): Promise<void> {
  const current = await loadUiSettings()
  const appearance = normalizeUiAppearance({ ...current.appearance, ...patch })
  await saveUiSettings({ ...current, appearance })
}

export async function resetUiAppearance(): Promise<void> {
  const current = await loadUiSettings()
  await saveUiSettings({
    ...current,
    appearance: normalizeUiAppearance(DEFAULT_UI_APPEARANCE)
  })
}

export async function saveUiBackgroundImage(dataUrl: string): Promise<void> {
  await saveUiAppearancePatch({ bgImageDataUrl: dataUrl })
}

export async function clearUiBackgroundImage(): Promise<void> {
  await saveUiAppearancePatch({ bgImageDataUrl: null })
}

export async function replaceUiSettings(next: UiSettings): Promise<{ externalWriteFailed: boolean }> {
  return saveUiSettings(next)
}

export function formatUiSettingsSummary(settings: UiSettings, locale: UiLocale): string[] {
  return formatUiSettingsSummaryLines(locale, settings)
}
