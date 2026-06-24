import windowsMessages from "../namespaces/windows.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type WindowsMessageKey = keyof typeof windowsMessages

const { t: tWindows } = createNamespaceTranslator(windowsMessages)

export { tWindows }
