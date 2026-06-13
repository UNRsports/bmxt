export type MessageVars = Readonly<Record<string, string | number>>

export function formatMessage(template: string, vars: MessageVars): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{${key}}`).join(String(value))
  }
  return result
}
