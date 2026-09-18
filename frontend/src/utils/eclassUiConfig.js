const UI_ONLY_PRODUCT_LINES = new Set(['PLMS', 'MIS']);

export function isUiOnlyEclassProductLine(productLine) {
  return UI_ONLY_PRODUCT_LINES.has(String(productLine || '').trim().toUpperCase());
}

export function adaptEclassOptionsForUi(options = {}) {
  return {
    ...options,
    product_lines: (options.product_lines || []).map((line) => (
      isUiOnlyEclassProductLine(line.key)
        ? { ...line, enabled: true, message: '', ui_only: true }
        : line
    ))
  };
}

export function buildUiOnlyEclassSchema(productLine, moduleKey, referenceSchema = {}) {
  const normalizedProductLine = String(productLine || '').trim().toUpperCase();
  const normalizedModuleKey = String(moduleKey || '').trim();
  const moduleLabel = normalizedModuleKey === 'communication' ? '交流会' : '大练兵';

  return {
    ...referenceSchema,
    product_line: normalizedProductLine,
    module: normalizedModuleKey,
    title: `${normalizedProductLine}${moduleLabel}数据处理`,
    enabled: true,
    process_enabled: false,
    ui_only: true,
    message: '',
    upload_slots: (referenceSchema.upload_slots || []).map((slot) => ({ ...slot }))
  };
}
