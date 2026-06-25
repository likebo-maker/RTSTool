export const TRAINING_REGION_GROUPS = [
  {
    name: '华北大区',
    color: '#00FF99',
    fill: 'rgba(0, 255, 136, 0.30)',
    hoverFill: 'rgba(0, 255, 136, 0.52)',
    branches: ['北京分公司', '天津分公司', '石家庄分公司', '太原分公司', '呼和浩特分公司'],
    adcodes: [110000, 120000, 130000, 140000, 150000]
  },
  {
    name: '东北大区',
    color: '#00BFFF',
    fill: 'rgba(0, 212, 255, 0.30)',
    hoverFill: 'rgba(0, 212, 255, 0.52)',
    branches: ['沈阳分公司', '大连分公司', '长春分公司', '哈尔滨分公司'],
    adcodes: [210000, 220000, 230000]
  },
  {
    name: '华东大区',
    color: '#9966FF',
    fill: 'rgba(124, 92, 255, 0.32)',
    hoverFill: 'rgba(124, 92, 255, 0.54)',
    branches: ['上海分公司', '南京分公司', '苏州分公司', '无锡分公司', '南通分公司', '杭州分公司', '宁波分公司', '温州分公司', '合肥分公司', '福州分公司', '厦门分公司', '济南分公司', '青岛分公司'],
    adcodes: [310000, 320000, 330000, 340000, 350000, 370000]
  },
  {
    name: '华中大区',
    color: '#7DD3FC',
    fill: 'rgba(125, 211, 252, 0.30)',
    hoverFill: 'rgba(125, 211, 252, 0.52)',
    branches: ['武汉分公司', '郑州分公司', '长沙分公司', '南昌分公司', '洛阳分公司', '徐州分公司'],
    adcodes: [420000, 410000, 430000, 360000, 320000]
  },
  {
    name: '华南大区',
    color: '#FF69B4',
    fill: 'rgba(255, 79, 216, 0.30)',
    hoverFill: 'rgba(255, 79, 216, 0.52)',
    branches: ['广州分公司', '深圳分公司', '东莞分公司', '佛山分公司', '南宁分公司', '海口分公司'],
    adcodes: [440000, 450000, 460000]
  },
  {
    name: '西南大区',
    color: '#FF8C00',
    fill: 'rgba(255, 122, 0, 0.30)',
    hoverFill: 'rgba(255, 122, 0, 0.52)',
    branches: ['成都分公司', '重庆分公司', '昆明分公司', '贵阳分公司'],
    adcodes: [510000, 500000, 530000, 520000]
  },
  {
    name: '西北大区',
    color: '#FFD700',
    fill: 'rgba(255, 204, 0, 0.30)',
    hoverFill: 'rgba(255, 204, 0, 0.52)',
    branches: ['西安分公司', '兰州分公司', '银川分公司', '西宁分公司', '乌鲁木齐分公司'],
    adcodes: [610000, 620000, 640000, 630000, 650000]
  }
];

const BRANCH_REGION_MAP = Object.fromEntries(
  TRAINING_REGION_GROUPS.flatMap((region) => region.branches.map((branch) => [branch, region.name]))
);

const BRANCH_ALIASES = {
  内蒙古分公司: '呼和浩特分公司',
  新疆分公司: '乌鲁木齐分公司',
  海南分公司: '海口分公司',
  黑吉分公司: '哈尔滨分公司',
  北京战略客户部: '北京分公司'
};

export function normalizeTrainingBranchName(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (BRANCH_REGION_MAP[raw]) return raw;
  if (BRANCH_ALIASES[raw]) return BRANCH_ALIASES[raw];

  for (const branch of Object.keys(BRANCH_REGION_MAP)) {
    const shortName = branch.replace(/分公司/g, '');
    if (raw.includes(branch) || raw.includes(shortName)) {
      return branch;
    }
  }

  if (raw.includes('北京战略客户部')) return '北京分公司';
  return raw;
}

export function resolveTrainingRegion(value) {
  const branch = normalizeTrainingBranchName(value);
  if (!branch) return '未匹配大区';
  const region = BRANCH_REGION_MAP[branch];
  if (!region) {
    console.warn(`未匹配到大区：${value}`);
    return '未匹配大区';
  }
  return region;
}

export function getTrainingRegionGroups() {
  return TRAINING_REGION_GROUPS;
}
