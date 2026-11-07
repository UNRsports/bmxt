/**
 * EN: Long-lived peer page (Firefox / optional Chrome) for WebRTC + FSA queue drain.
 * JA: WebRTC / FSA キュー消化用の長寿命 peer ページ。
 */
import { getSyncService } from "../../lib/features/sync"

async function tick(): Promise<void> {
  try {
    const service = getSyncService()
    await service.status()
  } catch {
    /* keep alive even if workdir missing */
  }
}

void tick()
setInterval(() => {
  void tick()
}, 4000)
