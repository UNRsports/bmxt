import compoundMessages from "../namespaces/compound.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type CompoundMessageKey = keyof typeof compoundMessages

const { t: tCompound } = createNamespaceTranslator(compoundMessages)

export { tCompound }
