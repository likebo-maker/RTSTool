import { getQualificationRegionGroups } from './branchGeoMap';

export const CONSTRUCTION_PRODUCT_LINES = ['IVD', 'MIS', 'PMLS'];

export const INTERNAL_TRAINING_CENTERS = [
  {
    name: '深圳培训中心',
    type: 'internal',
    city: '深圳',
    address: '深圳内部培训基地'
  },
  {
    name: '武汉培训中心',
    type: 'internal',
    city: '武汉',
    address: '武汉内部培训基地'
  },
  {
    name: '西安培训中心',
    type: 'internal',
    city: '西安',
    address: '西安内部培训基地'
  },
  {
    name: '南京培训中心',
    type: 'internal',
    city: '南京',
    address: '南京内部培训基地'
  }
];

const PROVINCE_BY_ADCODE = {
  110000: '北京',
  120000: '天津',
  130000: '河北',
  140000: '山西',
  150000: '内蒙古',
  210000: '辽宁',
  220000: '吉林',
  230000: '黑龙江',
  310000: '上海',
  320000: '江苏',
  330000: '浙江',
  340000: '安徽',
  350000: '福建',
  360000: '江西',
  370000: '山东',
  410000: '河南',
  420000: '湖北',
  430000: '湖南',
  440000: '广东',
  450000: '广西',
  460000: '海南',
  500000: '重庆',
  510000: '四川',
  520000: '贵州',
  530000: '云南',
  540000: '西藏',
  610000: '陕西',
  620000: '甘肃',
  630000: '青海',
  640000: '宁夏',
  650000: '新疆'
};

export const REGION_BY_PROVINCE = Object.fromEntries(
  getQualificationRegionGroups().flatMap((region) =>
    (region.adcodes || [])
      .map((adcode) => PROVINCE_BY_ADCODE[adcode])
      .filter(Boolean)
      .map((province) => [province, region.name])
  )
);

export const CITY_GEO_MAP = {
  北京: { province: '北京', coords: [116.407526, 39.90403] },
  上海: { province: '上海', coords: [121.473701, 31.230416] },
  天津: { province: '天津', coords: [117.200983, 39.084158] },
  重庆: { province: '重庆', coords: [106.551556, 29.563009] },
  石家庄: { province: '河北', coords: [114.514976, 38.042007] },
  太原: { province: '山西', coords: [112.549248, 37.857014] },
  呼和浩特: { province: '内蒙古', coords: [111.749181, 40.842585] },
  沈阳: { province: '辽宁', coords: [123.431475, 41.805698] },
  大连: { province: '辽宁', coords: [121.614682, 38.914003] },
  长春: { province: '吉林', coords: [125.323544, 43.817071] },
  哈尔滨: { province: '黑龙江', coords: [126.642464, 45.756967] },
  南京: { province: '江苏', coords: [118.796877, 32.060255] },
  苏州: { province: '江苏', coords: [120.585316, 31.298886] },
  无锡: { province: '江苏', coords: [120.31191, 31.49117] },
  南通: { province: '江苏', coords: [120.894291, 31.980171] },
  徐州: { province: '江苏', coords: [117.284124, 34.205768] },
  杭州: { province: '浙江', coords: [120.15515, 30.274149] },
  宁波: { province: '浙江', coords: [121.550357, 29.874556] },
  温州: { province: '浙江', coords: [120.699367, 27.994267] },
  合肥: { province: '安徽', coords: [117.227239, 31.820586] },
  福州: { province: '福建', coords: [119.296389, 26.074268] },
  厦门: { province: '福建', coords: [118.089425, 24.479834] },
  南昌: { province: '江西', coords: [115.858197, 28.682892] },
  济南: { province: '山东', coords: [117.120128, 36.652069] },
  青岛: { province: '山东', coords: [120.382639, 36.067082] },
  郑州: { province: '河南', coords: [113.625368, 34.746599] },
  洛阳: { province: '河南', coords: [112.45404, 34.619682] },
  武汉: { province: '湖北', coords: [114.305392, 30.593098] },
  长沙: { province: '湖南', coords: [112.938814, 28.228209] },
  广州: { province: '广东', coords: [113.264435, 23.129163] },
  深圳: { province: '广东', coords: [114.057868, 22.543099] },
  东莞: { province: '广东', coords: [113.751765, 23.020536] },
  佛山: { province: '广东', coords: [113.121416, 23.021548] },
  南宁: { province: '广西', coords: [108.366543, 22.817002] },
  海口: { province: '海南', coords: [110.198293, 20.044001] },
  成都: { province: '四川', coords: [104.066541, 30.572269] },
  贵阳: { province: '贵州', coords: [106.630153, 26.647661] },
  昆明: { province: '云南', coords: [102.832891, 24.880095] },
  拉萨: { province: '西藏', coords: [91.140856, 29.645554] },
  西安: { province: '陕西', coords: [108.93977, 34.341574] },
  兰州: { province: '甘肃', coords: [103.834303, 36.061089] },
  西宁: { province: '青海', coords: [101.778916, 36.623178] },
  银川: { province: '宁夏', coords: [106.230909, 38.487193] },
  乌鲁木齐: { province: '新疆', coords: [87.616848, 43.825592] }
};

const PROVINCE_ALIASES = {
  北京: ['北京市', '北京'],
  天津: ['天津市', '天津'],
  上海: ['上海市', '上海'],
  重庆: ['重庆市', '重庆'],
  河北: ['河北省', '河北'],
  山西: ['山西省', '山西'],
  内蒙古: ['内蒙古自治区', '内蒙古'],
  辽宁: ['辽宁省', '辽宁'],
  吉林: ['吉林省', '吉林'],
  黑龙江: ['黑龙江省', '黑龙江'],
  江苏: ['江苏省', '江苏'],
  浙江: ['浙江省', '浙江'],
  安徽: ['安徽省', '安徽'],
  福建: ['福建省', '福建'],
  江西: ['江西省', '江西'],
  山东: ['山东省', '山东'],
  河南: ['河南省', '河南'],
  湖北: ['湖北省', '湖北'],
  湖南: ['湖南省', '湖南'],
  广东: ['广东省', '广东'],
  广西: ['广西壮族自治区', '广西'],
  海南: ['海南省', '海南'],
  四川: ['四川省', '四川'],
  贵州: ['贵州省', '贵州'],
  云南: ['云南省', '云南'],
  西藏: ['西藏自治区', '西藏'],
  陕西: ['陕西省', '陕西'],
  甘肃: ['甘肃省', '甘肃'],
  青海: ['青海省', '青海'],
  宁夏: ['宁夏回族自治区', '宁夏'],
  新疆: ['新疆维吾尔自治区', '新疆']
};

const COURSE_LINE_RULES = [
  { line: 'MIS', patterns: ['低端超声', '超声'] },
  { line: 'PMLS', patterns: ['监护小产品', '监护', '麻醉', '输注', '呼吸', '灯床塔'] },
  {
    line: 'IVD',
    patterns: [
      '场景化磁珠法凝血',
      '中端凝血',
      '三分类血球',
      'BC-5000',
      '低速生化',
      'TLA',
      'MT8000',
      'IVD',
      '流式细胞',
      '生化',
      '化学发光',
      '尿液',
      '凝血',
      '血球',
      '免疫'
    ]
  }
];

export function normalizeCourseName(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, '')
    .replace(/[()]/g, (char) => (char === '(' ? '（' : '）'))
    .trim();
}

export function normalizeCenterName(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, '')
    .trim();
}

export function normalizeProductLine(value) {
  const text = String(value || '').trim().toUpperCase();
  if (text === 'PLMS') return 'PMLS';
  if (text.includes('PMLS')) return 'PMLS';
  if (text.includes('MIS')) return 'MIS';
  if (text.includes('IVD')) return 'IVD';
  return '';
}

export function resolveProductLineByCourse(courseName, courseLineMap = {}) {
  const normalizedCourse = normalizeCourseName(courseName);
  const fromStandard = normalizeProductLine(courseLineMap[normalizedCourse]);
  if (fromStandard) {
    return {
      productLine: fromStandard,
      source: '课程标准-国内'
    };
  }

  const matchedRule = COURSE_LINE_RULES.find((rule) =>
    rule.patterns.some((pattern) => normalizedCourse.includes(normalizeCourseName(pattern)))
  );
  if (matchedRule) {
    return {
      productLine: matchedRule.line,
      source: '本地补充配置'
    };
  }

  return {
    productLine: '未匹配产线',
    source: '未匹配'
  };
}

export function resolveTrainingCenterLocation({ address, city, centerName } = {}) {
  const sourceText = [address, city, centerName].filter(Boolean).join(' ');
  const normalizedText = sourceText.replace(/\u00a0/g, ' ').replace(/\s+/g, '');

  const matchedCity = findCityInText(normalizedText);
  if (matchedCity) {
    const cityMeta = CITY_GEO_MAP[matchedCity];
    return {
      city: matchedCity,
      province: cityMeta.province,
      region: REGION_BY_PROVINCE[cityMeta.province] || '未匹配大区',
      coords: [...cityMeta.coords],
      geoSource: 'address-city'
    };
  }

  const matchedProvince = findProvinceInText(normalizedText);
  if (matchedProvince) {
    const fallbackCity = findCapitalCityByProvince(matchedProvince);
    const cityMeta = CITY_GEO_MAP[fallbackCity];
    return {
      city: fallbackCity || matchedProvince,
      province: matchedProvince,
      region: REGION_BY_PROVINCE[matchedProvince] || '未匹配大区',
      coords: cityMeta ? [...cityMeta.coords] : null,
      geoSource: 'address-province'
    };
  }

  return {
    city: '',
    province: '',
    region: '未匹配大区',
    coords: null,
    geoSource: 'unmatched'
  };
}

function findCityInText(text) {
  return Object.keys(CITY_GEO_MAP)
    .sort((left, right) => right.length - left.length)
    .find((city) => text.includes(city) || text.includes(`${city}市`));
}

function findProvinceInText(text) {
  return Object.entries(PROVINCE_ALIASES).find(([, aliases]) => aliases.some((alias) => text.includes(alias)))?.[0] || '';
}

function findCapitalCityByProvince(province) {
  return Object.entries(CITY_GEO_MAP).find(([, meta]) => meta.province === province)?.[0] || '';
}
