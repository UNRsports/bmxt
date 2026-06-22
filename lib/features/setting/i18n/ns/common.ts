import commonMessages from "../namespaces/common.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type CommonMessageKey = keyof typeof commonMessages

const { t: tCommon } = createNamespaceTranslator(commonMessages)

export { tCommon }
