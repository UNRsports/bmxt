import errorMessages from "../namespaces/error.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type ErrorMessageKey = keyof typeof errorMessages

const { t: tError } = createNamespaceTranslator(errorMessages)

export { tError }
