import secondCommandPickerMessages from "../namespaces/secondCommandPicker.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type SecondCommandPickerMessageKey = keyof typeof secondCommandPickerMessages

const { t: tSecondCommandPicker } = createNamespaceTranslator(secondCommandPickerMessages)

export { tSecondCommandPicker }
