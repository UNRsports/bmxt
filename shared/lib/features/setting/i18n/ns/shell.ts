import shellMessages from "../namespaces/shell.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type ShellMessageKey = keyof typeof shellMessages

const { t: tShell } = createNamespaceTranslator(shellMessages)

export { tShell }
