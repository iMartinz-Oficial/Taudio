
const DB_NAME = 'TaudioFS';
const STORE_NAME = 'settings';
const DB_VERSION = 1;

/**
 * Inicializa la base de datos para guardar el 'handle' de la carpeta local.
 */
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

/**
 * Guarda el handle de la carpeta en IndexedDB para persistirlo entre sesiones.
 */
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

/**
 * Recupera el handle de la carpeta.
 */
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
 * Verifica y solicita permisos de lectura/escritura si es necesario.
 */
export const verifyPermission = async (handle: FileSystemHandle, readWrite: boolean = true): Promise<boolean> => {
  const options: any = {};
  if (readWrite) options.mode = 'readwrite';
  
  // @ts-ignore
  if ((await handle.queryPermission(options)) === 'granted') return true;
  // @ts-ignore
  if ((await handle.requestPermission(options)) === 'granted') return true;
  return false;
};

/**
 * Guarda un audio directamente en la carpeta local.
 */
export const saveAudio = async (docId: number, title: string, audioBlob: Blob): Promise<void> => {
  const folderHandle = await getFolderHandle();
  if (!folderHandle) throw new Error("No folder linked");
  
  const hasPermission = await verifyPermission(folderHandle);
  if (!hasPermission) throw new Error("Permission denied");

  // Fix: Corrected regex typo from [^a-z0-0] to [^a-z0-9]
  const fileName = `Taudio_${docId}_${title.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.wav`;
  const fileHandle = await folderHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(audioBlob);
  await writable.close();
};

/**
 * Recupera el audio desde la carpeta local.
 */
export const getAudio = async (docId: number, title: string): Promise<Blob | null> => {
  const folderHandle = await getFolderHandle();
  if (!folderHandle) return null;

  try {
    const hasPermission = await verifyPermission(folderHandle, false);
    if (!hasPermission) return null;

    // Buscamos el archivo que empiece por Taudio_ID
    const prefix = `Taudio_${docId}_`;
    // @ts-ignore
    for await (const entry of folderHandle.values()) {
      if (entry.kind === 'file' && entry.name.startsWith(prefix)) {
        // Fix: Property 'getFile' does not exist on type 'FileSystemHandle'. Casting to any as entry is verified as a file handle.
        const file = await (entry as any).getFile();
        return file;
      }
    }
  } catch (e) {
    console.warn("Error leyendo carpeta local:", e);
  }
  return null;
};

/**
 * Elimina un audio de la carpeta local.
 */
export const deleteAudio = async (docId: number): Promise<void> => {
  const folderHandle = await getFolderHandle();
  if (!folderHandle) return;

  try {
    const hasPermission = await verifyPermission(folderHandle);
    if (!hasPermission) return;

    const prefix = `Taudio_${docId}_`;
    // @ts-ignore
    for await (const entry of folderHandle.values()) {
      if (entry.kind === 'file' && entry.name.startsWith(prefix)) {
        await folderHandle.removeEntry(entry.name);
      }
    }
  } catch (e) {
    console.error("Error eliminando archivo local:", e);
  }
};
