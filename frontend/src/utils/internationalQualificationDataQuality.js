const PRODUCT_LINE_VALUES = new Set(['IVD', 'IVD-A', 'PMLS', 'MIS']);
const PRODUCT_LINE_MARKERS = new Set([...PRODUCT_LINE_VALUES, 'PLMS']);
const QUALIFICATION_TYPE_VALUES = new Set(['MCSR', 'CCAC', 'MCST']);
const PLACEHOLDER_VALUES = new Set([
  '',
  '-',
  '--',
  '/',
  'N/A',
  'NA',
  'NULL',
  'NONE',
  'UNKNOWN',
  'UNCLASSIFIED',
  'NOT APPLICABLE'
]);

const FIELD_LABELS = {
  productLine: 'Product Line',
  subProductLine: 'Sub-line',
  modelCategory: 'Model Category',
  qualificationType: 'Qualification Type'
};

/**
 * Audits filter dimensions without invalidating the qualification itself.
 *
 * A dimension issue means the row remains in engineer, qualification, country,
 * partner, expiry, map, and ranking totals. Only the affected dimension is
 * hidden from its filter options and distribution chart.
 */
export function auditInternationalQualificationDimensions(values = {}) {
  const normalized = {
    productLine: normalizeValue(values.productLine),
    subProductLine: normalizeValue(values.subProductLine),
    modelCategory: normalizeValue(values.modelCategory),
    qualificationType: normalizeValue(values.qualificationType)
  };
  const issues = [];

  if (isPlaceholder(normalized.productLine) || !PRODUCT_LINE_VALUES.has(normalized.productLine)) {
    addIssue(
      issues,
      'productLine',
      normalized.productLine,
      isPlaceholder(normalized.productLine)
        ? 'Product Line is blank or a placeholder.'
        : `Product Line is outside the configured values: ${[...PRODUCT_LINE_VALUES].join(', ')}.`
    );
  }

  if (isPlaceholder(normalized.subProductLine)) {
    addIssue(issues, 'subProductLine', normalized.subProductLine, 'Sub-line is blank or a placeholder.');
  } else if (PRODUCT_LINE_MARKERS.has(normalized.subProductLine)) {
    addIssue(
      issues,
      'subProductLine',
      normalized.subProductLine,
      `Sub-line contains a Product Line value (${normalized.subProductLine}).`
    );
  }

  if (isPlaceholder(normalized.modelCategory)) {
    addIssue(issues, 'modelCategory', normalized.modelCategory, 'Model Category is blank or a placeholder.');
  } else if (
    PRODUCT_LINE_MARKERS.has(normalized.modelCategory) ||
    QUALIFICATION_TYPE_VALUES.has(normalized.modelCategory) ||
    (normalized.subProductLine && normalized.modelCategory === normalized.subProductLine)
  ) {
    addIssue(
      issues,
      'modelCategory',
      normalized.modelCategory,
      `Model Category contains an upstream or qualification-type value (${normalized.modelCategory}).`
    );
  }

  if (isPlaceholder(normalized.qualificationType) || !QUALIFICATION_TYPE_VALUES.has(normalized.qualificationType)) {
    addIssue(
      issues,
      'qualificationType',
      normalized.qualificationType,
      isPlaceholder(normalized.qualificationType)
        ? 'Qualification Type is blank or a placeholder.'
        : `Qualification Type is outside the configured values: ${[...QUALIFICATION_TYPE_VALUES].join(', ')}.`
    );
  }

  return {
    issues,
    invalidFilterFields: [...new Set(issues.map((issue) => issue.field))]
  };
}

export function formatInternationalDimensionIssues(issues = []) {
  return issues.map((issue) => `${issue.label}: ${issue.reason}`).join(' | ');
}

function addIssue(issues, field, rawValue, reason) {
  issues.push({
    field,
    label: FIELD_LABELS[field] || field,
    rawValue: rawValue || '',
    reason
  });
}

function normalizeValue(value) {
  return String(value ?? '').trim().toUpperCase();
}

function isPlaceholder(value) {
  return PLACEHOLDER_VALUES.has(value);
}
