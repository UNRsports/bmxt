export {
  APPEARANCE_FLAG_TOKENS,
  BG_IMAGE_ALLOWED_MIME_TYPES,
  BG_IMAGE_MAX_BYTES,
  DEFAULT_TERMINAL_BG,
  DEFAULT_TERMINAL_FG,
  DEFAULT_TERMINAL_FONT_FAMILY,
  DEFAULT_TERMINAL_FONT_SIZE,
  DEFAULT_UI_APPEARANCE,
  DEFAULT_UI_APPEARANCE_LAYER,
  listAppearanceFlagTokens,
  normalizeUiAppearance,
  parseAppearanceFlagToken,
  resolvePickerAppearance,
  resolveSearchHighlightAppearance,
  resolveTerminalAppearance,
  type AppearanceFlagToken,
  type ResolvedTerminalAppearance,
  type ResolvedSearchHighlightAppearance,
  type UiAppearance,
  type UiAppearanceLayer
} from "./appearance"
export {
  appearanceToCssDeclarations,
  pickerAppearanceToCssDeclarations,
  resolvedAppearanceToScopedDeclarations,
  UI_THEME_HTML_SELECTOR,
  UNIFIED_BG_ATTR,
  useTerminalAppearance
} from "./apply-appearance"
export { importBackgroundImageFromFilePicker, type BgImageImportResult } from "./bg-image-import"
export {
  parseAppearanceResetConfirmAnswer,
  type AppearanceResetConfirmAnswer
} from "./parse-appearance-reset-confirm"
export {
  parseSettingPromptAnswer,
  type SettingPromptAnswer,
  type SettingPromptPending
} from "./parse-setting-edit-pending"
export {
  DEFAULT_UI_LOCALE,
  listUiLocaleSettingTokens,
  parseUiLocale,
  parseUiLocaleSettingToken,
  pickUiLabel,
  pickUiLines,
  settingTokenForUiLocale,
  uiBulletPrefix,
  type BilingualLines,
  type BilingualUiLabel,
  type UiLocale,
  type UiLocaleSettingToken
} from "./locale"
export {
  bgImportErrorLine,
  dispatchFailedLine,
  domListCaptureFailedLines,
  domListNoTargetLines,
  domListUnscriptableLines,
  errorLine,
  formatBulletedLines,
  formatMessage,
  formatUiSettingsSummaryLines,
  hasMessageKey,
  listMessageKeys,
  navStatusHint,
  optionalHostDeniedLines,
  t,
  getRunLocale,
  setRunLocale,
  searchStatusHint,
  tabsStatusHint,
  translateOnLogLine,
  translateStatusHint,
  translateStatusMeta,
  versionUpgradeTitle,
  type MessageKey,
  type MessageVars,
  type NavStatusMode
} from "./i18n"
export {
  parseSettingIncompleteLine,
  parseSettingListPickerLine,
  parseSettingExitListLine
} from "./setting-list-picker-input"
export {
  createSettingListPickerState,
  settingPickerApplyDraftToMain,
  settingPickerGoToView,
  settingPickerRevertDraft,
  settingPickerUpdateDraft,
  type SettingListPickerState,
  type SettingListPickerView
} from "./setting-list-picker-state"
export {
  buildSettingPickerRows,
  fontSizeFromPickerIndex,
  fontSizePickerIndexForValue,
  settingPickerHeadline,
  settingPickerInitialHi,
  type SettingPickerRow,
  type SettingPickerRowId
} from "./setting-picker-rows"
export { SettingPickerWrapper, type SettingPickerWrapperProps } from "./setting-picker-wrapper"
export {
  resolveSettingPickerPreviewAppearance,
  type SettingEditField,
  validateSettingEditValue
} from "./setting-picker-edit"
export {
  buildUiSettingsStorageEntries,
  EXTERNAL_SETTINGS_BUNDLE_DIR,
  formatExternalSettingsBundleDisplayName,
  listKnownBundleImageFileNames,
  exportUiSettingsZip,
  importUiSettingsZipFromFilePicker,
  type SettingsExportJson
} from "./settings-export"
export {
  activateExternalUiSettingsStorage,
  activateInternalUiSettingsStorage,
  isFileSystemAccessAvailable,
  pickUiSettingsDirectory,
  reloadUiSettingsFromExternalDirectory,
  repickUiSettingsDirectory,
  resolveExternalSettingsBundleDir,
  tryLoadUiSettingsFromExternal,
  trySaveUiSettingsToExternal,
  type ExternalStorageErrorCode,
  type PickUiSettingsDirectoryResult
} from "./settings-external-storage"
export {
  DEFAULT_UI_SETTINGS_STORAGE_CONFIG,
  normalizeUiSettingsStorageConfig,
  type UiSettingsStorageConfig,
  type UiSettingsStorageMode
} from "./settings-storage-mode"
export { loadUiSettingsStorageConfig, saveUiSettingsStorageConfig } from "./settings-storage-config"
export { useUiSettingsStorageConfig } from "./use-ui-settings-storage-config"
export {
  assessExternalSettingsBundleAtStartup,
  externalSettingsRecoveryLogLines,
  applyExternalSettingsRecoveryAnswer,
  type ExternalBundleMissingItem,
  type ExternalSettingsStartupAssessment,
  type ExternalSettingsRecoveryAnswerResult
} from "./external-settings-startup"
export {
  ExternalSettingsRecoveryProvider,
  useExternalSettingsRecovery,
  type ExternalSettingsRecoveryContextValue
} from "./use-external-settings-recovery"
export {
  clearUiBackgroundImage,
  formatUiSettingsSummary,
  loadUiSettings,
  loadUiSettingsInternalCache,
  replaceUiSettings,
  resetUiSettingsToDefaultsAndInternal,
  resetUiAppearance,
  saveUiAppearancePatch,
  saveUiBackgroundImage,
  saveUiLocale,
  type UiSettings
} from "./settings"
export { buildAppearancePatch } from "./appearance"
export { UiSettingsProvider, useUiLocale, useUiSettings } from "./use-ui-settings"
export { parseHexColor, previewHexColor } from "./validate-color"
export { parseFontFamily } from "./validate-font"
export { MAX_FONT_SIZE_PX, MIN_FONT_SIZE_PX, parseFontSizePx } from "./validate-size"
export { buildZipArchive, parseZipArchive, crc32, type ZipEntry } from "./zip-store"
