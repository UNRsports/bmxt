export {
  APPEARANCE_FLAG_TOKENS,
  BG_IMAGE_ALLOWED_MIME_TYPES,
  BG_IMAGE_MAX_BYTES,
  DEFAULT_TERMINAL_BG,
  DEFAULT_TERMINAL_FG,
  DEFAULT_TERMINAL_FONT_FAMILY,
  DEFAULT_TERMINAL_FONT_SIZE,
  DEFAULT_UI_APPEARANCE,
  listAppearanceFlagTokens,
  parseAppearanceFlagToken,
  resolveTerminalAppearance,
  type AppearanceFlagToken,
  type ResolvedTerminalAppearance,
  type UiAppearance
} from "./appearance"
export { appearanceToCssDeclarations, UI_THEME_HTML_SELECTOR, useTerminalAppearance } from "./apply-appearance"
export { importBackgroundImageFromFilePicker, type BgImageImportResult } from "./bg-image-import"
export { parseAppearanceResetConfirmAnswer, type AppearanceResetConfirmAnswer } from "./parse-appearance-reset-confirm"
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
  tabsStatusHint,
  translateOnLogLine,
  translateStatusHint,
  translateStatusMeta,
  versionUpgradeTitle,
  type MessageKey,
  type MessageVars,
  type NavStatusMode
} from "./i18n"
export { useUiCopy, useUiLocaleOrDefault } from "./use-ui-copy"
export {
  parseSettingCommandLine,
  validateAppearanceCommand,
  type SettingCommandParse
} from "./parse-setting-command"
export {
  clearUiBackgroundImage,
  formatUiSettingsSummary,
  loadUiSettings,
  resetUiAppearance,
  saveUiAppearancePatch,
  saveUiBackgroundImage,
  saveUiLocale,
  type UiSettings
} from "./settings"
export { UiSettingsProvider, useUiLocale, useUiSettings } from "./use-ui-settings"
export { parseHexColor } from "./validate-color"
export { parseFontFamily } from "./validate-font"
export { MAX_FONT_SIZE_PX, MIN_FONT_SIZE_PX, parseFontSizePx } from "./validate-size"
