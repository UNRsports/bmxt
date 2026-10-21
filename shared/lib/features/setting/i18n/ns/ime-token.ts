import imeTokenMessages from "../namespaces/imeToken.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type ImeTokenMessageKey = keyof typeof imeTokenMessages

const { t: tImeToken } = createNamespaceTranslator(imeTokenMessages)

export { tImeToken }
