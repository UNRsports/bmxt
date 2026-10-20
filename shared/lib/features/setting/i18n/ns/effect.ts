import effectMessages from "../namespaces/effect.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type EffectMessageKey = keyof typeof effectMessages

const { t: tEffect } = createNamespaceTranslator(effectMessages)

export { tEffect }
