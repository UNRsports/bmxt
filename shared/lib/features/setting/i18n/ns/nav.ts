import navMessages from "../namespaces/nav.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type NavMessageKey = keyof typeof navMessages

const { t: tNav } = createNamespaceTranslator(navMessages)

export { tNav }
