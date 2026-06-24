import versionUpgradeMessages from "../namespaces/versionUpgrade.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type VersionUpgradeMessageKey = keyof typeof versionUpgradeMessages

const { t: tVersionUpgrade } = createNamespaceTranslator(versionUpgradeMessages)

export { tVersionUpgrade }
