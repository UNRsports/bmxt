# Chrome SP (smartphone)

**Shell model:** same as Chrome PC — existing popup (`windows.create` / `action.onClicked`).

There is no separate CWS Android package today. Runtime form-factor (`host-env/sp`) still applies when `os === "android"` (extra-keys, capability stubs if APIs are missing).

Source lives here so Chrome PC/SP stay directory-separated; packaging entry remains [`../pc/wxt.config.ts`](../pc/wxt.config.ts) via [`../wxt.config.ts`](../wxt.config.ts).
