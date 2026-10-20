import pipeMessages from "../namespaces/pipe.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type PipeMessageKey = keyof typeof pipeMessages

const { t: tPipe } = createNamespaceTranslator(pipeMessages)

export { tPipe }
