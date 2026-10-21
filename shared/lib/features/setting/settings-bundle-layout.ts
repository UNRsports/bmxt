export const SETTINGS_JSON_NAME = "settings.json"
export const BG_IMAGE_BUNDLE_NAME = "background-image"
export const PICKER_BG_IMAGE_BUNDLE_NAME = "picker-background-image"
/** EN: Subdirectory created under the user-picked parent for external storage bundle. */
export const EXTERNAL_SETTINGS_BUNDLE_DIR = "bmxt-ui-settings"

const BUNDLE_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"] as const

/** EN: All background image file names that may exist in an external settings bundle. */
export function listKnownBundleImageFileNames(): string[] {
  const names: string[] = []
  for (const base of [BG_IMAGE_BUNDLE_NAME, PICKER_BG_IMAGE_BUNDLE_NAME]) {
    for (const ext of BUNDLE_IMAGE_EXTENSIONS) {
      names.push(`${base}.${ext}`)
    }
  }
  return names
}

export function formatExternalSettingsBundleDisplayName(
  parentDirName: string,
  bundleDirName: string = EXTERNAL_SETTINGS_BUNDLE_DIR
): string {
  return `${parentDirName}/${bundleDirName}`
}
