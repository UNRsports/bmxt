const DB_NAME = "bmxt_settings_fs_handles"
const DB_VERSION = 1
const STORE_NAME = "handles"
const UI_SETTINGS_DIR_KEY = "ui_settings_directory"
const SNAPSHOT_VAULT_DIR_KEY = "snapshot_vault_directory"

type HandleRecord = {
  id: string
  handle: FileSystemDirectoryHandle
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => {
      reject(request.error ?? new Error("indexedDB open failed"))
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }
    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

function runTx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openHandleDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        const request = run(store)
        request.onerror = () => {
          reject(request.error ?? new Error("indexedDB request failed"))
        }
        request.onsuccess = () => {
          resolve(request.result)
        }
        tx.oncomplete = () => {
          db.close()
        }
        tx.onerror = () => {
          reject(tx.error ?? new Error("indexedDB transaction failed"))
        }
      })
  )
}

export async function saveUiSettingsDirectoryHandle(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const record: HandleRecord = { id: UI_SETTINGS_DIR_KEY, handle }
  await runTx("readwrite", (store) => store.put(record))
}

export async function loadUiSettingsDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const record = await runTx<HandleRecord | undefined>("readonly", (store) =>
    store.get(UI_SETTINGS_DIR_KEY)
  )
  if (!record || !record.handle) {
    return null
  }
  return record.handle
}

export async function clearUiSettingsDirectoryHandle(): Promise<void> {
  await runTx("readwrite", (store) => store.delete(UI_SETTINGS_DIR_KEY))
}

export async function saveSnapshotVaultDirectoryHandle(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const record: HandleRecord = { id: SNAPSHOT_VAULT_DIR_KEY, handle }
  await runTx("readwrite", (store) => store.put(record))
}

export async function loadSnapshotVaultDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const record = await runTx<HandleRecord | undefined>("readonly", (store) =>
    store.get(SNAPSHOT_VAULT_DIR_KEY)
  )
  if (!record || !record.handle) {
    return null
  }
  return record.handle
}

export async function clearSnapshotVaultDirectoryHandle(): Promise<void> {
  await runTx("readwrite", (store) => store.delete(SNAPSHOT_VAULT_DIR_KEY))
}
