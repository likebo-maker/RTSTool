import { normalizeTrainingBranchName } from './branchRegionMap';

const TRAINING_BRANCH_GEO_MAP = {
  北京分公司: { city: '北京', coords: [116.407526, 39.90403] },
  天津分公司: { city: '天津', coords: [117.200983, 39.084158] },
  石家庄分公司: { city: '石家庄', coords: [114.514976, 38.042007] },
  太原分公司: { city: '太原', coords: [112.549248, 37.857014] },
  呼和浩特分公司: { city: '呼和浩特', coords: [111.749181, 40.842585] },
  沈阳分公司: { city: '沈阳', coords: [123.431475, 41.805698] },
  大连分公司: { city: '大连', coords: [121.614682, 38.914003] },
  长春分公司: { city: '长春', coords: [125.323544, 43.817071] },
  哈尔滨分公司: { city: '哈尔滨', coords: [126.642464, 45.756967] },
  上海分公司: { city: '上海', coords: [121.473701, 31.230416] },
  南京分公司: { city: '南京', coords: [118.796877, 32.060255] },
  苏州分公司: { city: '苏州', coords: [120.585316, 31.298886] },
  无锡分公司: { city: '无锡', coords: [120.311889, 31.491064] },
  南通分公司: { city: '南通', coords: [120.894291, 31.980172] },
  杭州分公司: { city: '杭州', coords: [120.15515, 30.274149] },
  宁波分公司: { city: '宁波', coords: [121.550357, 29.874557] },
  温州分公司: { city: '温州', coords: [120.699367, 27.994267] },
  合肥分公司: { city: '合肥', coords: [117.227239, 31.820586] },
  福州分公司: { city: '福州', coords: [119.296389, 26.074268] },
  厦门分公司: { city: '厦门', coords: [118.089425, 24.479834] },
  济南分公司: { city: '济南', coords: [117.120128, 36.652069] },
  青岛分公司: { city: '青岛', coords: [120.382639, 36.067082] },
  武汉分公司: { city: '武汉', coords: [114.305392, 30.593098] },
  郑州分公司: { city: '郑州', coords: [113.625368, 34.746599] },
  长沙分公司: { city: '长沙', coords: [112.938814, 28.228209] },
  南昌分公司: { city: '南昌', coords: [115.858197, 28.682892] },
  洛阳分公司: { city: '洛阳', coords: [112.453895, 34.619702] },
  徐州分公司: { city: '徐州', coords: [117.285983, 34.205768] },
  广州分公司: { city: '广州', coords: [113.264435, 23.129163] },
  深圳分公司: { city: '深圳', coords: [114.057868, 22.543099] },
  东莞分公司: { city: '东莞', coords: [113.751765, 23.020536] },
  佛山分公司: { city: '佛山', coords: [113.121416, 23.021548] },
  南宁分公司: { city: '南宁', coords: [108.366543, 22.817002] },
  海口分公司: { city: '海口', coords: [110.198293, 20.044001] },
  成都分公司: { city: '成都', coords: [104.066541, 30.572269] },
  重庆分公司: { city: '重庆', coords: [106.551556, 29.563009] },
  昆明分公司: { city: '昆明', coords: [102.832891, 24.880095] },
  贵阳分公司: { city: '贵阳', coords: [106.630153, 26.647661] },
  西安分公司: { city: '西安', coords: [108.93977, 34.341574] },
  兰州分公司: { city: '兰州', coords: [103.834303, 36.061089] },
  银川分公司: { city: '银川', coords: [106.230909, 38.487194] },
  西宁分公司: { city: '西宁', coords: [101.778228, 36.617144] },
  乌鲁木齐分公司: { city: '乌鲁木齐', coords: [87.616848, 43.825592] }
};

const unmatchedTrainingBranchSet = new Set();

export function resolveTrainingGeo(branchValue) {
  const branch = normalizeTrainingBranchName(branchValue);
  if (!branch) return null;
  const hit = TRAINING_BRANCH_GEO_MAP[branch];
  if (hit) return { branch, ...hit };

  if (!unmatchedTrainingBranchSet.has(branchValue)) {
    unmatchedTrainingBranchSet.add(branchValue);
    console.warn(`未匹配到分公司坐标：${branchValue}`);
  }
  return null;
}

