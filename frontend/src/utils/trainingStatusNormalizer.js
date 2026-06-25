const PASS_PATTERNS = ['合格', '通过', '已通过', 'pass'];
const FAIL_PATTERNS = ['不合格', '未通过', 'fail', '未合格'];

export function normalizeTrainingResult(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return {
      raw,
      normalized: '未知',
      isEffective: false,
      isPass: false,
      isFail: false
    };
  }

  const lowerRaw = raw.toLowerCase();
  // Check fail markers first because "不合格" contains "合格".
  if (FAIL_PATTERNS.some((item) => lowerRaw.includes(item.toLowerCase()))) {
    return {
      raw,
      normalized: '不合格',
      isEffective: true,
      isPass: false,
      isFail: true
    };
  }

  if (PASS_PATTERNS.some((item) => lowerRaw.includes(item.toLowerCase()))) {
    return {
      raw,
      normalized: '合格',
      isEffective: true,
      isPass: true,
      isFail: false
    };
  }

  return {
    raw,
    normalized: '未知',
    isEffective: false,
    isPass: false,
    isFail: false
  };
}

export function formatPassRate(passCount, effectiveCount) {
  if (!effectiveCount) return '暂无';
  return `${((passCount / effectiveCount) * 100).toFixed(1)}%`;
}
