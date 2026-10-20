/** EN: Cooperative main-thread yield between heavy job steps. */
export async function yieldToMain(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
}
