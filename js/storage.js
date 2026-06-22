/**
 * Управление сохранением/восстановлением плейлиста.
 *
 * - IndexedDB: хранит handle директории (FileSystemDirectoryHandle)
 * - localStorage: хранит порядок треков (массив имён файлов)
 *
 * При перезагрузке:
 *   1. Восстанавливаем dirHandle из IndexedDB
 *   2. Запрашиваем permission
 *   3. Рекурсивно читаем аудиофайлы
 *   4. Сортируем согласно сохранённому порядку
 *   5. Новые файлы (которых не было в сохранённом порядке) добавляем в конец
 */
class PlaylistStorage {
  static DB_NAME = 'WAP_PlaylistDB';
  static DB_VERSION = 1;
  static STORE_NAME = 'handles';
  static HANDLE_KEY = 'dirHandle';

  // ===== IndexedDB: сохранение/восстановление handle директории =====

  static async saveDirHandle(dirHandle) {
    try {
      const db = await this._openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.put(dirHandle, this.HANDLE_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      });
    } catch (e) {
      console.warn('Не удалось сохранить handle директории:', e);
    }
  }

  static async loadDirHandle() {
    try {
      const db = await this._openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.get(this.HANDLE_KEY);
        request.onsuccess = () => {
          db.close();
          resolve(request.result || null);
        };
        request.onerror = () => {
          db.close();
          reject(request.error);
        };
      });
    } catch (e) {
      console.warn('Не удалось загрузить handle директории:', e);
      return null;
    }
  }

  static async removeDirHandle() {
    try {
      const db = await this._openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.delete(this.HANDLE_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      });
    } catch (e) {
      console.warn('Не удалось удалить handle директории:', e);
    }
  }

  static _openDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB не поддерживается браузером'));
        return;
      }
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== localStorage: порядок треков =====

  static saveTrackOrder(tracks) {
    try {
      const order = tracks.map((t) => t.name);
      localStorage.setItem('playlistOrder', JSON.stringify(order));
    } catch (e) {
      console.warn('Не удалось сохранить порядок треков:', e);
    }
  }

  static loadTrackOrder() {
    try {
      const data = localStorage.getItem('playlistOrder');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Не удалось загрузить порядок треков:', e);
      return null;
    }
  }

  static removeTrackOrder() {
    try {
      localStorage.removeItem('playlistOrder');
    } catch (e) {
      console.warn('Не удалось удалить порядок треков:', e);
    }
  }

  // ===== Восстановление плейлиста из директории =====

  static async restorePlaylist(player) {
    const dirHandle = await this.loadDirHandle();
    if (!dirHandle) return false;

    // Запрашиваем permission
    let permission = await dirHandle.queryPermission({ mode: 'read' });
    if (permission !== 'granted') {
      permission = await dirHandle.requestPermission({ mode: 'read' });
    }
    if (permission !== 'granted') {
      console.warn('Нет доступа к директории');
      return false;
    }

    // Читаем файлы
    const audioFiles = [];
    await player.traverseDirectory(dirHandle, audioFiles);
    if (audioFiles.length === 0) return false;

    // Загружаем сохранённый порядок
    const savedOrder = this.loadTrackOrder();

    // Сортируем: сначала те, что были в сохранённом порядке, потом новые
    if (savedOrder) {
      audioFiles.sort((a, b) => {
        const ai = savedOrder.indexOf(a.name);
        const bi = savedOrder.indexOf(b.name);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    // Восстанавливаем плейлист
    player.restoreFromFiles(audioFiles);
    return true;
  }
}