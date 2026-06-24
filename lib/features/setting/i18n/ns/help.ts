import helpMessages from "../namespaces/help.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type HelpMessageKey = keyof typeof helpMessages

const { t: tHelp } = createNamespaceTranslator(helpMessages)

export { tHelp }
