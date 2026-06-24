import modeStatusMessages from "../namespaces/modeStatus.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type ModeStatusMessageKey = keyof typeof modeStatusMessages

const { t: tModeStatus } = createNamespaceTranslator(modeStatusMessages)

export { tModeStatus }
