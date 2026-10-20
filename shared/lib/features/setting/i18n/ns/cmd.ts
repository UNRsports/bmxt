import cmdMessages from "../namespaces/cmd.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type CmdMessageKey = keyof typeof cmdMessages

const { t: tCmd } = createNamespaceTranslator(cmdMessages)

export { tCmd }
