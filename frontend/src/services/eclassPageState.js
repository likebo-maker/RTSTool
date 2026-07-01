export const defaultEclassSchema = {
  enabled: false,
  title: '',
  description: '',
  message: '正在读取上传模板...',
  upload_slots: []
};

export const eclassPageState = {
  initialized: false,
  options: null,
  productLine: 'IVD',
  moduleKey: 'big_teach',
  states: {}
};

export function eclassStateKey(productLine, moduleKey) {
  return `${String(productLine || '').trim().toUpperCase()}::${String(moduleKey || '').trim()}`;
}

export function getEclassCombinationState(productLine, moduleKey) {
  return eclassPageState.states[eclassStateKey(productLine, moduleKey)] || null;
}

export function setEclassCombinationState(productLine, moduleKey, state) {
  eclassPageState.states[eclassStateKey(productLine, moduleKey)] = state;
}
