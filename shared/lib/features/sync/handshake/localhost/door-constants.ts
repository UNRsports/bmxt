/**
 * EN: Fixed loopback door shared with hosts/cli (todo §11 / CONTRACT).
 * JA: hosts/cli と共有する固定 loopback 玄関（todo §11 / CONTRACT）。
 */

export const LOCALHOST_DOOR_PORT = 17653 as const

export const LOCALHOST_DOOR_ORIGINS = [
  `http://127.0.0.1:${LOCALHOST_DOOR_PORT}`,
  `http://localhost:${LOCALHOST_DOOR_PORT}`
] as const

export const LOCALHOST_DOOR_HOST_PERMISSIONS = [
  `http://127.0.0.1:${LOCALHOST_DOOR_PORT}/*`,
  `http://localhost:${LOCALHOST_DOOR_PORT}/*`
] as const

/** EN: Prefer IPv4 loopback (matches CLI bind). */
export const LOCALHOST_DOOR_BASE_URL = LOCALHOST_DOOR_ORIGINS[0]
