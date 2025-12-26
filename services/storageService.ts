
const DB_NAME = 'TaudioFS';
const STORE_NAME = 'settings';
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveFolderHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(handle, 'audio_folder_handle');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getFolderHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('audio_folder_handle');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Solo consulta el estado actual sin disparar pop-ups.
 */
export const queryFolderPermission = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  // @ts-ignore
  const state = await handle.queryPermission({ mode: 'readwrite' });
  return state === 'granted';
};

/**
 * Solicita el permiso (debe ser llamado desde un evento de usuario: clic).
 */
export const requestFolderPermission = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  // @ts-ignore
  const state = await handle.requestPermission({ mode: 'readwrite' });
  return state === 'granted';
};

export const saveAudio = async (docId: number, title: string, audioBlob: Blob): Promise<void> => {
  const folderHandle = await getFolderHandle();
  if (!folderHandle) throw new Error("FOLDER_NOT_LINKED");
  
  const granted = await queryFolderPermission(folderHandle);
  if (!granted) throw new Error("PERMISSION_DENIED");

  const fileName = `Taudio_${docId}_${title.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.wav`;
  const fileHandle = await folderHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(audioBlob);
  await writable.close();
};

export const getAudio = async (docId: number, title: string): Promise<Blob | null> => {
  const folderHandle = await getFolderHandle();
  if (!folderHandle) return null;

  try {
    // IMPORTANTE: Aquí solo consultamos. No pedimos permiso para evitar spam al cargar la lista.
    const granted = await queryFolderPermission(folderHandle);
    if (!granted) return null;

    const prefix = `Taudio_${docId}_`;
    // @ts-ignore
    for await (const entry of folderHandle.values()) {
      if (entry.kind === 'file' && entry.name.startsWith(prefix)) {
        const file = await (entry as any).getFile();
        return file;
      }
    }
  } catch (e) {
    console.warn("Error leyendo audio:", e);
  }
  return null;
};

export const deleteAudio = async (docId: number): Promise<void> => {
  const folderHandle = await getFolderHandle();
  if (!folderHandle) return;

  try {
    const granted = await queryFolderPermission(folderHandle);
    if (!granted) return;

    const prefix = `Taudio_${docId}_`;
    // @ts-ignore
    for await (const entry of folderHandle.values()) {
      if (entry.kind === 'file' && entry.name.startsWith(prefix)) {
        await folderHandle.removeEntry(entry.name);
      }
    }
  } catch (e) {
    console.error("Error eliminando archivo:", e);
  }
};
