/**
 * EN: Shim — shell mode lives in `host-env` (Firefox SP → tab; others → popup).
 * JA: シム。シェル形態は host-env（Firefox SP のみタブ、他は popup）。
 */

export { usesTabShell, resolveShellMode, type HostShellMode } from "../host-env/index.ts"
