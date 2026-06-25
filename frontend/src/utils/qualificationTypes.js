import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export const QUALIFICATION_STATUS_OPTIONS = ['全部', '有效', '30天内到期', '60天内到期', '90天内到期', '已过期'];

const DATE_FORMATS = [
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'YYYY.M.D',
  'YYYY.M.D HH:mm:ss',
  'YYYY-MM-DD HH:mm:ss',
  'YYYY/MM/DD HH:mm:ss',
  'YYYY年M月D日',
  'M/D/YYYY',
  'M/D/YYYY H:mm:ss',
  'YYYYMMDD'
];

export function parseQualificationDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return dayjs(value);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return dayjs(excelSerialToDate(value));
  }

  const rawText = String(value).trim();
  if (!rawText) return null;

  for (const format of DATE_FORMATS) {
    const parsed = dayjs(rawText, format, true);
    if (parsed.isValid()) return parsed;
  }

  const fallback = dayjs(rawText);
  return fallback.isValid() ? fallback : null;
}

export function buildQualificationStatus(value, referenceDate = dayjs()) {
  const parsed = parseQualificationDate(value);
  if (!parsed) {
    return {
      status: '未识别',
      statusLabel: '未识别',
      isCurrentlyValid: false,
      daysUntilExpiry: null,
      expiryDate: null,
      expiryDateText: ''
    };
  }

  const expiryDate = parsed.endOf('day');
  const today = referenceDate.startOf('day');
  const daysUntilExpiry = expiryDate.diff(today, 'day');

  if (daysUntilExpiry < 0) {
    return createStatusMeta('已过期', expiryDate, daysUntilExpiry, false);
  }
  if (daysUntilExpiry <= 30) {
    return createStatusMeta('30天内到期', expiryDate, daysUntilExpiry, true);
  }
  if (daysUntilExpiry <= 60) {
    return createStatusMeta('60天内到期', expiryDate, daysUntilExpiry, true);
  }
  if (daysUntilExpiry <= 90) {
    return createStatusMeta('90天内到期', expiryDate, daysUntilExpiry, true);
  }
  return createStatusMeta('有效', expiryDate, daysUntilExpiry, true);
}

export function getStatusTone(status) {
  if (status === '已过期') return 'critical';
  if (status === '30天内到期' || status === '60天内到期') return 'warning';
  if (status === '90天内到期') return 'attention';
  if (status === '有效') return 'good';
  return 'muted';
}

export function formatDateText(value) {
  const parsed = parseQualificationDate(value);
  return parsed ? parsed.format('YYYY-MM-DD') : '';
}

function createStatusMeta(status, expiryDate, daysUntilExpiry, isCurrentlyValid) {
  return {
    status,
    statusLabel: status,
    isCurrentlyValid,
    daysUntilExpiry,
    expiryDate,
    expiryDateText: expiryDate.format('YYYY-MM-DD')
  };
}

function excelSerialToDate(serial) {
  const wholeDays = Math.floor(serial);
  const milliseconds = Math.round((serial - wholeDays) * 86400000);
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + wholeDays * 86400000 + milliseconds);
}
