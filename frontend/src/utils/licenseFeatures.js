export const FEATURES = {
  TIMEOUT_FILTER: 'timeout_filter',
  ONLINE_SERVICE_TARGET: 'online_service_target',
  ONLINE_SERVICE_KPI: 'online_service_kpi',
  QUALIFICATION_MAP: 'qualification_map',
  TRAINING_MAP: 'training_map',
  ELEARNING_DATA: 'elearning_data',
  EXPORT_EXCEL: 'export_excel',
  EXPORT_PDF: 'export_pdf',
  AI_ASSISTANT: 'ai_assistant',
  ADMIN: 'admin'
};

export const FEATURE_LABELS = {
  [FEATURES.TIMEOUT_FILTER]: '超时工单筛选',
  [FEATURES.ONLINE_SERVICE_TARGET]: '在线服务项目目标',
  [FEATURES.ONLINE_SERVICE_KPI]: '在线服务考核指标',
  [FEATURES.QUALIFICATION_MAP]: '中国区人员服务资质地图',
  [FEATURES.TRAINING_MAP]: '中国区培训覆盖地图',
  [FEATURES.ELEARNING_DATA]: 'E课堂数据处理',
  [FEATURES.EXPORT_EXCEL]: 'Excel导出',
  [FEATURES.EXPORT_PDF]: 'PDF导出',
  [FEATURES.AI_ASSISTANT]: 'AI助手',
  [FEATURES.ADMIN]: '管理员权限'
};

export const TOOL_FEATURES = {
  'timeout-ticket-filter': FEATURES.TIMEOUT_FILTER,
  'online-business-calculation': FEATURES.ONLINE_SERVICE_TARGET,
  'online-service-assessment': FEATURES.ONLINE_SERVICE_KPI,
  'service-qualification-map': FEATURES.QUALIFICATION_MAP,
  'training-coverage-map': FEATURES.TRAINING_MAP,
  'eclass-data': FEATURES.ELEARNING_DATA
};

export const TOOL_LABELS = {
  home: '首页',
  'license-center': '授权中心',
  'about-platform': '关于平台',
  'timeout-ticket-filter': '超时工单筛选',
  'online-business-calculation': '在线服务项目目标',
  'online-service-assessment': '在线服务考核指标',
  'service-qualification-map': '中国区人员服务资质地图',
  'training-coverage-map': '中国区培训覆盖地图',
  'eclass-data': 'E课堂数据处理'
};

const FEATURE_ALIASES = {
  access_app: FEATURES.TIMEOUT_FILTER,
  timeout_ticket_filter: FEATURES.TIMEOUT_FILTER,
  online_business_calculation: FEATURES.ONLINE_SERVICE_TARGET,
  service_qualification_map: FEATURES.QUALIFICATION_MAP,
  training_coverage_map: FEATURES.TRAINING_MAP,
  eclass_data: FEATURES.ELEARNING_DATA
};

export function normalizeFeatureKey(featureKey) {
  return FEATURE_ALIASES[featureKey] || featureKey;
}

export function normalizeFeatures(features) {
  const normalized = Object.fromEntries(Object.values(FEATURES).map((feature) => [feature, false]));

  if (Array.isArray(features)) {
    features.forEach((feature) => {
      const key = normalizeFeatureKey(feature);
      if (key in normalized) normalized[key] = true;
    });
  } else if (features && typeof features === 'object') {
    Object.entries(features).forEach(([feature, enabled]) => {
      const key = normalizeFeatureKey(feature);
      if (key in normalized) normalized[key] = Boolean(enabled);
    });
  }

  if (normalized[FEATURES.ADMIN]) {
    Object.keys(normalized).forEach((feature) => {
      normalized[feature] = true;
    });
  }

  return normalized;
}

export function isLicenseExpired(licenseInfo) {
  return licenseInfo?.enabled !== false && licenseInfo?.status === 'expired';
}

export function hasFeature(licenseInfo, featureKey) {
  if (!featureKey) return true;
  if (licenseInfo?.enabled === false) return true;
  if (isLicenseExpired(licenseInfo)) return false;
  if (licenseInfo?.status !== 'active') return false;

  const features = normalizeFeatures(licenseInfo?.features);
  return Boolean(features[FEATURES.ADMIN] || features[normalizeFeatureKey(featureKey)]);
}

export function hasToolAccess(licenseInfo, toolKey) {
  if (toolKey === 'home' || toolKey === 'license-center' || toolKey === 'about-platform') return true;
  return hasFeature(licenseInfo, TOOL_FEATURES[toolKey]);
}

export function toolFeatureLabel(toolKey) {
  return TOOL_LABELS[toolKey] || FEATURE_LABELS[TOOL_FEATURES[toolKey]] || toolKey;
}
