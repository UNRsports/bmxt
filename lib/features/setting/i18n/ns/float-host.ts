import floatHostMessages from "../namespaces/floatHost.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type FloatHostMessageKey = keyof typeof floatHostMessages

const { t: tFloatHost } = createNamespaceTranslator(floatHostMessages)

export { tFloatHost }
