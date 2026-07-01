import { reactive } from 'vue';

export const PROCESS_TASK_KEYS = {
  TIMEOUT_TICKETS: 'timeout_tickets',
  ONLINE_SERVICE_TARGET: 'online_service_target',
  ONLINE_SERVICE_ASSESSMENT: 'online_service_assessment'
};

const tasks = reactive({});

export function createEclassTaskKey(productLine, moduleKey) {
  return `eclass:${String(productLine || '').trim().toUpperCase()}::${String(moduleKey || '').trim()}`;
}

export function getProcessTask(taskKey) {
  const normalizedKey = String(taskKey || '').trim();
  if (!tasks[normalizedKey]) {
    tasks[normalizedKey] = createIdleTask(normalizedKey);
  }
  return tasks[normalizedKey];
}

export function isTaskProcessing(taskKey) {
  return getProcessTask(taskKey).status === 'processing';
}

export function startProcessTask(taskKey, patch = {}) {
  const task = getProcessTask(taskKey);
  Object.assign(task, createIdleTask(task.key), {
    ...patch,
    status: 'processing',
    resultState: patch.resultState || 'processing',
    progress: patch.progress ?? 0,
    message: patch.message || '处理中',
    error: '',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return task;
}

export function updateProcessTask(taskKey, patch = {}) {
  const task = getProcessTask(taskKey);
  Object.assign(task, patch, {
    updatedAt: new Date().toISOString()
  });
  return task;
}

export function completeProcessTask(taskKey, patch = {}) {
  const task = getProcessTask(taskKey);
  Object.assign(task, patch, {
    status: 'success',
    resultState: patch.resultState || 'success',
    progress: patch.progress ?? 100,
    error: '',
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return task;
}

export function failProcessTask(taskKey, error, patch = {}) {
  const message = typeof error === 'string' ? error : error?.message || '处理失败';
  const task = getProcessTask(taskKey);
  Object.assign(task, patch, {
    status: 'error',
    resultState: 'error',
    progress: patch.progress ?? 0,
    message,
    error: message,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return task;
}

export function resetProcessTask(taskKey, patch = {}) {
  const task = getProcessTask(taskKey);
  Object.assign(task, createIdleTask(task.key), patch, {
    updatedAt: new Date().toISOString()
  });
  return task;
}

function createIdleTask(key) {
  return {
    key,
    status: 'idle',
    resultState: 'idle',
    progress: 0,
    message: '',
    downloadUrl: '',
    stats: null,
    preview: null,
    outputs: [],
    outputFolder: '',
    openFolderUrl: '',
    targetYear: '',
    inputs: null,
    meta: {},
    error: '',
    startedAt: '',
    completedAt: '',
    updatedAt: ''
  };
}
