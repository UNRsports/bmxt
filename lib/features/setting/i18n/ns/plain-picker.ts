import plainPickerMessages from "../namespaces/plainPicker.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type PlainPickerMessageKey = keyof typeof plainPickerMessages

const { t: tPlainPicker } = createNamespaceTranslator(plainPickerMessages)

export { tPlainPicker }
