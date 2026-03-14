// assets/js/db.js

(function () {
  const DB_NAME = "RoyaltyRunnerDB";
  const DB_VERSION = 1;

  const STORES = {
    PROFILE: "profile",
    WORKS: "works",
    DOCUMENTS: "documents",
    CONTRACTS: "contracts",
    SETTINGS: "settings",
  };

  let dbInstance = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORES.PROFILE)) {
          db.createObjectStore(STORES.PROFILE, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORES.WORKS)) {
          const store = db.createObjectStore(STORES.WORKS, { keyPath: "id" });
          store.createIndex("by_title", "title", { unique: false });
          store.createIndex("by_createdAt", "createdAt", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
          db.createObjectStore(STORES.DOCUMENTS, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORES.CONTRACTS)) {
          db.createObjectStore(STORES.CONTRACTS, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = () => reject(request.error);
    });
  }

  function saveToStore(storeName, data) {
    return openDB().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(data);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    });
  }

  function getAllFromStore(storeName) {
    return openDB().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  }

  function getFromStore(storeName, id) {
    return openDB().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
  }

  function deleteFromStore(storeName, id) {
    return openDB().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    });
  }

  // WORKS HELPERS (recorded + uploaded + progress + studio state)

  function createWorkId() {
    return "work_" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function saveWork(work) {
    if (!work.id) work.id = createWorkId();
    if (!work.createdAt) work.createdAt = Date.now();
    if (!work.progress) {
      work.progress = {
        pro_registered: false,
        mechanical_registered: false,
        copyright_registered: false,
        neighboring_registered: false,
        split_sheet: false,
      };
    }
    return saveToStore(STORES.WORKS, work);
  }

  function getAllWorks() {
    return getAllFromStore(STORES.WORKS);
  }

  function getWorkById(id) {
    return getFromStore(STORES.WORKS, id);
  }

  function deleteWork(id) {
    return deleteFromStore(STORES.WORKS, id);
  }

  function updateWorkProgress(id, field, value) {
    return getWorkById(id).then((work) => {
      if (!work) return;
      if (!work.progress) {
        work.progress = {
          pro_registered: false,
          mechanical_registered: false,
          copyright_registered: false,
          neighboring_registered: false,
          split_sheet: false,
        };
      }
      work.progress[field] = value;
      return saveWork(work);
    });
  }

  // Expose globals
  window.RRDB = {
    STORES,
    openDB,
    saveToStore,
    getAllFromStore,
    getFromStore,
    deleteFromStore,
    // works-specific
    saveWork,
    getAllWorks,
    getWorkById,
    deleteWork,
    updateWorkProgress,
  };
})();
