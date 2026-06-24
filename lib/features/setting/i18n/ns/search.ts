import searchMessages from "../namespaces/search.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type SearchMessageKey = keyof typeof searchMessages

const { t: tSearch } = createNamespaceTranslator(searchMessages)

export { tSearch }
