export const QUALIFICATION_REGION_GROUPS = [
  {
    name: '东北大区',
    color: '#00BFFF',
    fill: 'rgba(0, 212, 255, 0.34)',
    hoverFill: 'rgba(0, 212, 255, 0.58)',
    branches: ['沈阳分公司', '黑吉分公司', '大连分公司', '内蒙古分公司'],
    adcodes: [230000, 220000, 210000, 150000],
    center: [124.5, 44.5]
  },
  {
    name: '华北大区',
    color: '#00FF99',
    fill: 'rgba(0, 255, 136, 0.32)',
    hoverFill: 'rgba(0, 255, 136, 0.56)',
    branches: ['北京分公司', '石家庄分公司', '天津分公司', '济南分公司', '青岛分公司', '北京战略客户部'],
    adcodes: [110000, 120000, 130000, 370000],
    center: [117.2, 37.6]
  },
  {
    name: '华东大区',
    color: '#9966FF',
    fill: 'rgba(124, 92, 255, 0.34)',
    hoverFill: 'rgba(124, 92, 255, 0.58)',
    branches: ['武汉分公司', '杭州分公司', '上海分公司', '苏州分公司', '南京分公司', '合肥分公司'],
    adcodes: [420000, 330000, 310000, 320000, 340000],
    center: [116.8, 31.2]
  },
  {
    name: '西北大区',
    color: '#FFD700',
    fill: 'rgba(255, 204, 0, 0.34)',
    hoverFill: 'rgba(255, 204, 0, 0.58)',
    branches: ['西安分公司', '兰州分公司', '新疆分公司', '太原分公司', '郑州分公司'],
    adcodes: [610000, 620000, 650000, 140000, 410000, 640000, 630000],
    center: [100.6, 38.2]
  },
  {
    name: '西南大区',
    color: '#FF8C00',
    fill: 'rgba(255, 122, 0, 0.34)',
    hoverFill: 'rgba(255, 122, 0, 0.58)',
    branches: ['成都分公司', '贵阳分公司', '昆明分公司', '重庆分公司', '南宁分公司'],
    adcodes: [510000, 520000, 530000, 500000, 450000, 540000],
    center: [105.0, 26.6]
  },
  {
    name: '华南大区',
    color: '#FF69B4',
    fill: 'rgba(255, 79, 216, 0.34)',
    hoverFill: 'rgba(255, 79, 216, 0.58)',
    branches: ['长沙分公司', '南昌分公司', '福州分公司', '广州分公司', '深圳分公司', '海南分公司'],
    adcodes: [430000, 360000, 350000, 440000, 460000],
    center: [113.5, 24.2]
  }
];

const BRANCH_REGION_MAP = Object.fromEntries(
  QUALIFICATION_REGION_GROUPS.flatMap((region) => region.branches.map((branch) => [branch, region.name]))
);

const BRANCH_GEO_MAP = {
  北京分公司: { city: '北京', coords: [116.407526, 39.90403] },
  北京战略客户部: { city: '北京', coords: [116.407526, 39.90403] },
  上海分公司: { city: '上海', coords: [121.473701, 31.230416] },
  广州分公司: { city: '广州', coords: [113.264435, 23.129163] },
  深圳分公司: { city: '深圳', coords: [114.057868, 22.543099] },
  成都分公司: { city: '成都', coords: [104.066541, 30.572269] },
  武汉分公司: { city: '武汉', coords: [114.305392, 30.593098] },
  杭州分公司: { city: '杭州', coords: [120.15515, 30.274149] },
  南京分公司: { city: '南京', coords: [118.796877, 32.060255] },
  西安分公司: { city: '西安', coords: [108.93977, 34.341574] },
  重庆分公司: { city: '重庆', coords: [106.551556, 29.563009] },
  沈阳分公司: { city: '沈阳', coords: [123.431475, 41.805698] },
  济南分公司: { city: '济南', coords: [117.120128, 36.652069] },
  郑州分公司: { city: '郑州', coords: [113.625368, 34.746599] },
  长沙分公司: { city: '长沙', coords: [112.938814, 28.228209] },
  南昌分公司: { city: '南昌', coords: [115.858197, 28.682892] },
  福州分公司: { city: '福州', coords: [119.296389, 26.074268] },
  昆明分公司: { city: '昆明', coords: [102.832891, 24.880095] },
  贵阳分公司: { city: '贵阳', coords: [106.630153, 26.647661] },
  南宁分公司: { city: '南宁', coords: [108.366543, 22.817002] },
  新疆分公司: { city: '乌鲁木齐', coords: [87.616848, 43.825592] },
  乌鲁木齐分公司: { city: '乌鲁木齐', coords: [87.616848, 43.825592] },
  兰州分公司: { city: '兰州', coords: [103.834303, 36.061089] },
  内蒙古分公司: { city: '呼和浩特', coords: [111.749181, 40.842585] },
  呼和浩特分公司: { city: '呼和浩特', coords: [111.749181, 40.842585] },
  黑吉分公司: { city: '哈尔滨', coords: [126.642464, 45.756967] },
  哈尔滨分公司: { city: '哈尔滨', coords: [126.642464, 45.756967] },
  长春分公司: { city: '长春', coords: [125.323544, 43.817071] },
  '长春分公司（已废弃）': { city: '长春', coords: [125.323544, 43.817071] },
  天津分公司: { city: '天津', coords: [117.200983, 39.084158] },
  太原分公司: { city: '太原', coords: [112.549248, 37.857014] },
  石家庄分公司: { city: '石家庄', coords: [114.514976, 38.042007] },
  合肥分公司: { city: '合肥', coords: [117.227239, 31.820586] },
  青岛分公司: { city: '青岛', coords: [120.382639, 36.067082] },
  苏州分公司: { city: '苏州', coords: [120.585316, 31.298886] },
  大连分公司: { city: '大连', coords: [121.614682, 38.914003] },
  海南分公司: { city: '海口', coords: [110.198293, 20.044001] },
  总部: { city: '深圳', coords: [114.057868, 22.543099] }
};

const unmatchedBranchSet = new Set();

const CITY_ALIAS_MAP = {
  北京: [116.407526, 39.90403],
  上海: [121.473701, 31.230416],
  广州: [113.264435, 23.129163],
  深圳: [114.057868, 22.543099],
  成都: [104.066541, 30.572269],
  武汉: [114.305392, 30.593098],
  杭州: [120.15515, 30.274149],
  南京: [118.796877, 32.060255],
  西安: [108.93977, 34.341574],
  重庆: [106.551556, 29.563009],
  沈阳: [123.431475, 41.805698],
  济南: [117.120128, 36.652069],
  郑州: [113.625368, 34.746599],
  长沙: [112.938814, 28.228209],
  南昌: [115.858197, 28.682892],
  福州: [119.296389, 26.074268],
  昆明: [102.832891, 24.880095],
  贵阳: [106.630153, 26.647661],
  南宁: [108.366543, 22.817002],
  乌鲁木齐: [87.616848, 43.825592],
  兰州: [103.834303, 36.061089],
  呼和浩特: [111.749181, 40.842585],
  哈尔滨: [126.642464, 45.756967],
  长春: [125.323544, 43.817071]
};

export function resolveBranchGeo(branchName) {
  const branch = String(branchName || '').trim();
  if (!branch) return null;

  if (BRANCH_GEO_MAP[branch]) {
    return { branch, region: BRANCH_REGION_MAP[branch] || '', ...BRANCH_GEO_MAP[branch] };
  }

  const normalized = branch.replace(/（.*?）/g, '').replace(/分公司|战略客户部|总部/g, '');
  for (const [city, coords] of Object.entries(CITY_ALIAS_MAP)) {
    if (normalized.includes(city)) {
      return { branch, region: BRANCH_REGION_MAP[branch] || '', city, coords };
    }
  }

  if (!unmatchedBranchSet.has(branch)) {
    unmatchedBranchSet.add(branch);
    console.warn(`未匹配到分公司坐标：${branch}`);
  }
  return null;
}

export function getBranchGeoMap() {
  return BRANCH_GEO_MAP;
}

export function resolveBranchRegion(branchName) {
  const branch = String(branchName || '').trim();
  if (!branch) return '';
  return BRANCH_REGION_MAP[branch] || '';
}

export function getQualificationRegionGroups() {
  return QUALIFICATION_REGION_GROUPS;
}
