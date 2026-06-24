import settingMessages from "../namespaces/setting.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type SettingMessageKey = keyof typeof settingMessages

const { t: tSetting } = createNamespaceTranslator(settingMessages)

export { tSetting }
