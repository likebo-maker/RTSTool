const DB_NAME = 'tsep-local-datasets';
const DB_VERSION = 1;
const STORE_NAME = 'toolDatasets';
const LOCAL_STORAGE_PREFIX = 'tsep-tool-dataset:';

let dbPromise = null;

export const LOCAL_DATASET_KEYS = {
  TIMEOUT_TICKETS: 'timeout_tickets',
  ONLINE_SERVICE_TARGET: 'online_service_target',
  ONLINE_SERVICE_ASSESSMENT: 'online_service_assessment',
  SERVICE_QUALIFICATION_MAP: 'service_qualification_map',
  TRAINING_COVERAGE_MAP: 'training_coverage_map'
};

export async function saveToolDataset(toolKey, payload) {
  const record = {
    toolKey,
    payload,
    updatedAt: new Date().toISOString()
  };

  try {
    const db = await openDatasetDb();
    await runStoreRequest('readwrite', (store) => store.put(record));
    return true;
  } catch (error) {
    console.warn(`IndexedDB 保存失败，降级到 localStorage：${toolKey}`, error);
    return saveDatasetToLocalStorage(toolKey, record);
  }
}

export async function loadToolDataset(toolKey) {
  try {
    const db = await openDatasetDb();
    const record = await runStoreRequest('readonly', (store) => store.get(toolKey));
    return record || loadDatasetFromLocalStorage(toolKey);
  } catch (error) {
    console.warn(`IndexedDB 读取失败，尝试 localStorage：${toolKey}`, error);
    return loadDatasetFromLocalStorage(toolKey);
  }
}

function openDatasetDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('当前环境不支持 IndexedDB'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'toolKey' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('打开本地数据库失败'));
  });
  return dbPromise;
}

async function runStoreRequest(mode, operation) {
  const db = await openDatasetDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('本地数据库操作失败'));
    transaction.onerror = () => reject(transaction.error || new Error('本地数据库事务失败'));
  });
}

function saveDatasetToLocalStorage(toolKey, record) {
  try {
    window.localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${toolKey}`, JSON.stringify(record));
    return true;
  } catch (error) {
    console.warn(`localStorage 保存失败：${toolKey}`, error);
    return false;
  }
}

function loadDatasetFromLocalStorage(toolKey) {
  try {
    const rawValue = window.localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${toolKey}`);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    console.warn(`localStorage 读取失败：${toolKey}`, error);
    return null;
  }
}
