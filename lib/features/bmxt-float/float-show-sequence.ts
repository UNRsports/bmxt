/**
 * EN: Pure show/inject retry sequence (no Chrome imports — unit-testable).
 * JA: 表示／注入リトライの純関数（Chrome 非依存・単体テスト可）。
 */

/**
 * EN: Pure show sequence. Returns true when the float host reports visible.
 */
export async function showFloatOnTabWithInject(
  tabId: number,
  deps: {
    sendShow: (tabId: number) => Promise<boolean | null>
    inject: (tabId: number) => Promise<boolean>
    markDesired: (tabId: number) => Promise<void>
    wait: (ms: number) => Promise<void>
  }
): Promise<boolean> {
  let visible = await deps.sendShow(tabId)
  if (visible === true) {
    await deps.markDesired(tabId)
    return true
  }

  const injected = await deps.inject(tabId)
  if (injected) {
    await deps.wait(120)
    visible = await deps.sendShow(tabId)
    if (visible === true) {
      await deps.markDesired(tabId)
      return true
    }
  }

  await deps.wait(400)
  visible = await deps.sendShow(tabId)
  if (visible === true) {
    await deps.markDesired(tabId)
    return true
  }
  return false
}
