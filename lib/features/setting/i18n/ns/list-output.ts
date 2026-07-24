import listOutputMessages from "../namespaces/listOutput.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type ListOutputMessageKey = keyof typeof listOutputMessages

const { t: tListOutput } = createNamespaceTranslator(listOutputMessages)

export { tListOutput }
