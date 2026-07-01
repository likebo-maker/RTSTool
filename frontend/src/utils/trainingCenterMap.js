import { resolveTrainingGeo } from './trainingGeoMap';

const CITY_COORDS = {
  北京: [116.407526, 39.90403],
  上海: [121.473701, 31.230416],
  深圳: [114.057868, 22.543099],
  武汉: [114.305392, 30.593098],
  西安: [108.93977, 34.341574],
  南京: [118.796877, 32.060255],
  长沙: [112.938814, 28.228209],
  新疆: [87.616848, 43.825592]
};

const EXACT_RULES = [
  { patterns: ['北京迈瑞研究院', '北京研究院'], center: '北京分公司', city: '北京' },
  { patterns: ['北京普利生'], center: '北京普利生', city: '北京' },
  { patterns: ['北京旭日鸿升'], center: '北京旭日鸿升', city: '北京' },
  { patterns: ['深圳总部-', '深圳总部'], center: '深圳总部', city: '深圳' },
  { patterns: ['深圳光明工厂', '光明'], center: '深圳总部', city: '深圳' },
  { patterns: ['西安培训中心'], center: '西安培训中心', city: '西安' },
  { patterns: ['湖北省武汉市江夏区', '迈瑞全球培训体验中心（武汉）', '迈瑞全球培训体验中心(武汉)', '武汉培训中心'], center: '武汉培训中心', city: '武汉' },
  { patterns: ['南京基地', '南京迈瑞', '南京培训中心'], center: '南京培训中心', city: '南京' },
  { patterns: ['上海长岛'], center: '上海长岛', city: '上海' },
  { patterns: ['长沙天地人'], center: '长沙天地人', city: '长沙' }
];

const CITY_PREFIX_RULES = [
  { prefix: '北京', city: '北京' },
  { prefix: '上海', city: '上海' },
  { prefix: '深圳', city: '深圳' },
  { prefix: '武汉', city: '武汉' },
  { prefix: '西安', city: '西安' },
  { prefix: '南京', city: '南京' },
  { prefix: '长沙', city: '长沙' }
];

const CENTER_ORDER = [
  '北京分公司',
  '北京培训中心',
  '北京普利生',
  '北京旭日鸿升',
  '上海长岛',
  '深圳总部',
  '武汉分公司',
  '武汉培训中心',
  '西安培训中心',
  '南京培训中心',
  '长沙天地人'
];

const CENTER_COORD_OFFSETS = {
  北京: {
    北京分公司: [0.00, 0.00],
    北京培训中心: [-0.11, 0.075],
    北京普利生: [0.12, -0.055],
    北京旭日鸿升: [-0.035, -0.12]
  },
  武汉: {
    武汉分公司: [-0.075, 0.055],
    武汉培训中心: [0.075, -0.055]
  },
  南京: {
    南京分公司: [-0.07, 0.045],
    南京培训中心: [0.07, -0.045]
  },
  深圳: {
    深圳分公司: [-0.07, 0.04],
    深圳总部: [0.07, -0.04]
  }
};

export function resolveTrainingCenter(locationValue) {
  const raw = normalizeLocation(locationValue);
  if (!raw) return { center: '未知培训中心', city: '', coords: null };

  for (const rule of EXACT_RULES) {
    if (rule.patterns.some((pattern) => raw.includes(pattern))) {
      return buildCenterResult(rule.center, rule.city);
    }
  }

  const branchMatch = raw.match(/^(.{1,12}?分公司)/);
  if (branchMatch) {
    const center = branchMatch[1];
    const city = center.replace(/分公司$/, '');
    return buildCenterResult(center, city);
  }

  for (const rule of CITY_PREFIX_RULES) {
    if (raw.startsWith(rule.prefix)) {
      return buildCenterResult(`${rule.city}培训中心`, rule.city);
    }
  }

  return { center: '未知培训中心', city: '', coords: null };
}

export function resolveTrainingCenterGeo(centerValue, cityValue) {
  const center = String(centerValue || '').trim();
  const city = String(cityValue || '').trim();
  const cityCoords = CITY_COORDS[city];
  const branchGeo = !cityCoords && center.endsWith('分公司') ? resolveTrainingGeo(center) : null;
  const baseCoords = cityCoords || branchGeo?.coords;
  const resolvedCity = city || branchGeo?.city || '';
  if (!center || !baseCoords) return null;
  return {
    center,
    city: resolvedCity,
    coords: offsetCoords(baseCoords, center, resolvedCity)
  };
}

function buildCenterResult(center, city) {
  const geo = resolveTrainingCenterGeo(center, city);
  return {
    center,
    city,
    coords: geo?.coords || null
  };
}

function normalizeLocation(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/[（）]/g, (char) => (char === '（' ? '(' : ')'))
    .trim();
}

function offsetCoords(coords, center, city) {
  const namedOffset = CENTER_COORD_OFFSETS[city]?.[center];
  if (namedOffset) return applyCoordOffset(coords, namedOffset);

  const sameCityCenters = CENTER_ORDER.filter((item) => {
    const resolved = resolveKnownCenterCity(item);
    return resolved === city;
  });
  const index = sameCityCenters.includes(center)
    ? sameCityCenters.indexOf(center)
    : sameCityCenters.length + (Math.abs(hashText(center)) % 6);
  const total = Math.max(sameCityCenters.length + 4, 6);
  if (total <= 1 && !sameCityCenters.includes(center)) return coords;

  const angle = (Math.PI * 2 * index) / total;
  const radius = resolveOffsetRadius(city, index);
  return [
    Number((coords[0] + Math.cos(angle) * radius).toFixed(6)),
    Number((coords[1] + Math.sin(angle) * radius).toFixed(6))
  ];
}

function applyCoordOffset(coords, offset) {
  return [
    Number((coords[0] + offset[0]).toFixed(6)),
    Number((coords[1] + offset[1]).toFixed(6))
  ];
}

function resolveOffsetRadius(city, index) {
  if (city === '北京') return 0.14 + (index % 2) * 0.035;
  if (city === '深圳' || city === '武汉' || city === '南京') return 0.085 + (index % 2) * 0.025;
  return 0.07 + (index % 2) * 0.02;
}

function resolveKnownCenterCity(center) {
  if (center.startsWith('北京')) return '北京';
  if (center.startsWith('上海')) return '上海';
  if (center.startsWith('深圳')) return '深圳';
  if (center.startsWith('武汉')) return '武汉';
  if (center.startsWith('西安')) return '西安';
  if (center.startsWith('南京')) return '南京';
  if (center.startsWith('长沙')) return '长沙';
  return '';
}

function hashText(text) {
  return [...String(text || '')].reduce((total, char) => total + char.charCodeAt(0), 0);
}
