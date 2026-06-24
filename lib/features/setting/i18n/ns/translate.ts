import translateMessages from "../namespaces/translate.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type TranslateMessageKey = keyof typeof translateMessages

const { t: tTranslate } = createNamespaceTranslator(translateMessages)

export { tTranslate }
