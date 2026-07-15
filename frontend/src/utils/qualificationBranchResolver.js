import { getQualificationRegionGroups } from './branchGeoMap';

export const SHENZHEN_HEADQUARTERS = '深圳总部';
export const NO_CONTRACTOR_LABEL = '中国区（非渠道商）';
export const UNMATCHED_BRANCH = '未匹配分公司';

const OFFICIAL_BRANCHES = getQualificationRegionGroups().flatMap((region) => region.branches);
const OFFICIAL_BRANCH_SET = new Set(OFFICIAL_BRANCHES);

const BRANCH_ALIASES = {
  总部: SHENZHEN_HEADQUARTERS,
  中国区总部: SHENZHEN_HEADQUARTERS,
  中国区用户服务部: SHENZHEN_HEADQUARTERS,
  用户服务部: SHENZHEN_HEADQUARTERS,
  用服总部: SHENZHEN_HEADQUARTERS,
  哈尔滨分公司: '黑吉分公司',
  长春分公司: '黑吉分公司',
  吉林分公司: '黑吉分公司',
  乌鲁木齐分公司: '新疆分公司',
  呼和浩特分公司: '内蒙古分公司',
  海口分公司: '海南分公司',
  厦门分公司: '福州分公司',
  无锡分公司: '南京分公司',
  南通分公司: '南京分公司',
  宁波分公司: '杭州分公司',
  温州分公司: '杭州分公司',
  东莞分公司: '广州分公司',
  佛山分公司: '广州分公司',
  洛阳分公司: '郑州分公司',
  徐州分公司: '南京分公司'
};

const BRANCH_NAME_MATCHERS = buildBranchNameMatchers();

const LOCATION_BRANCH_RULES = [
  ['北京分公司', ['北京市', '北京']],
  ['上海分公司', ['上海市', '上海']],
  ['天津分公司', ['天津市', '天津']],
  ['重庆分公司', ['重庆市', '重庆']],
  ['广州分公司', ['广东省', '广东', '广州市', '广州', '东莞市', '东莞', '佛山市', '佛山', '珠海市', '珠海', '中山市', '中山', '惠州市', '惠州', '汕头市', '汕头', '江门市', '江门']],
  ['深圳分公司', ['深圳市', '深圳']],
  ['海南分公司', ['海南省', '海南', '海口市', '海口', '三亚市', '三亚']],
  ['杭州分公司', ['浙江省', '浙江', '杭州市', '杭州', '宁波市', '宁波', '温州市', '温州', '绍兴市', '绍兴', '嘉兴市', '嘉兴', '湖州市', '湖州', '金华市', '金华', '台州市', '台州', '舟山市', '舟山', '丽水市', '丽水', '衢州市', '衢州']],
  ['南京分公司', ['江苏省', '江苏', '南京市', '南京', '无锡市', '无锡', '常州市', '常州', '南通市', '南通', '扬州市', '扬州', '镇江市', '镇江', '泰州市', '泰州', '盐城市', '盐城', '徐州市', '徐州', '连云港市', '连云港', '淮安市', '淮安', '宿迁市', '宿迁']],
  ['苏州分公司', ['苏州市', '苏州']],
  ['合肥分公司', ['安徽省', '安徽', '合肥市', '合肥', '芜湖市', '芜湖', '蚌埠市', '蚌埠', '阜阳市', '阜阳', '安庆市', '安庆']],
  ['武汉分公司', ['湖北省', '湖北', '武汉市', '武汉', '襄阳市', '襄阳', '宜昌市', '宜昌', '荆州市', '荆州']],
  ['福州分公司', ['福建省', '福建', '福州市', '福州', '厦门市', '厦门', '泉州市', '泉州', '漳州市', '漳州', '莆田市', '莆田']],
  ['南昌分公司', ['江西省', '江西', '南昌市', '南昌', '赣州市', '赣州', '九江市', '九江', '上饶市', '上饶']],
  ['长沙分公司', ['湖南省', '湖南', '长沙市', '长沙', '株洲市', '株洲', '湘潭市', '湘潭', '衡阳市', '衡阳', '岳阳市', '岳阳']],
  ['郑州分公司', ['河南省', '河南', '郑州市', '郑州', '洛阳市', '洛阳', '开封市', '开封', '新乡市', '新乡', '南阳市', '南阳']],
  ['太原分公司', ['山西省', '山西', '太原市', '太原', '大同市', '大同', '长治市', '长治']],
  ['石家庄分公司', ['河北省', '河北', '石家庄市', '石家庄', '唐山市', '唐山', '保定市', '保定', '邯郸市', '邯郸', '秦皇岛市', '秦皇岛']],
  ['济南分公司', ['山东省', '山东', '济南市', '济南', '泰安市', '泰安', '烟台市', '烟台', '潍坊市', '潍坊', '临沂市', '临沂', '淄博市', '淄博', '济宁市', '济宁']],
  ['青岛分公司', ['青岛市', '青岛']],
  ['沈阳分公司', ['辽宁省', '辽宁', '沈阳市', '沈阳', '鞍山市', '鞍山', '抚顺市', '抚顺', '锦州市', '锦州']],
  ['大连分公司', ['大连市', '大连']],
  ['黑吉分公司', ['黑龙江省', '黑龙江', '哈尔滨市', '哈尔滨', '吉林省', '吉林市', '吉林', '长春市', '长春']],
  ['内蒙古分公司', ['内蒙古自治区', '内蒙古', '呼和浩特市', '呼和浩特', '包头市', '包头']],
  ['成都分公司', ['四川省', '四川', '成都市', '成都', '绵阳市', '绵阳', '德阳市', '德阳', '宜宾市', '宜宾', '泸州市', '泸州']],
  ['昆明分公司', ['云南省', '云南', '昆明市', '昆明', '曲靖市', '曲靖', '大理市', '大理']],
  ['贵阳分公司', ['贵州省', '贵州', '贵阳市', '贵阳', '遵义市', '遵义']],
  ['南宁分公司', ['广西壮族自治区', '广西', '南宁市', '南宁', '柳州市', '柳州', '桂林市', '桂林']],
  ['西安分公司', ['陕西省', '陕西', '西安市', '西安', '咸阳市', '咸阳', '宝鸡市', '宝鸡']],
  ['兰州分公司', ['甘肃省', '甘肃', '兰州市', '兰州', '宁夏回族自治区', '宁夏', '银川市', '银川', '青海省', '青海', '西宁市', '西宁']],
  ['新疆分公司', ['新疆维吾尔自治区', '新疆', '乌鲁木齐市', '乌鲁木齐']]
].map(([branch, tokens]) => ({
  branch,
  tokens: [...tokens].sort((left, right) => right.length - left.length)
}));

const LOCATION_TOKEN_MATCHERS = LOCATION_BRANCH_RULES
  .flatMap((rule) => rule.tokens.map((token) => ({
    branch: rule.branch,
    token,
    priority: /省$|自治区$|特别行政区$/u.test(token) ? 0 : 1
  })))
  .sort((left, right) => right.priority - left.priority || right.token.length - left.token.length);

export function normalizeQualificationBranchName(value) {
  const text = normalizeText(value);
  if (!text) return '';
  if (OFFICIAL_BRANCH_SET.has(text)) return text;
  if (BRANCH_ALIASES[text]) return BRANCH_ALIASES[text];
  return resolveOfficialBranchByName(text) || resolveBranchByLocation(text);
}

export function resolveQualificationBranch({ rawBranch, contractorName, sourceSheet } = {}) {
  const normalizedRawBranch = normalizeQualificationBranchName(rawBranch);
  if (normalizedRawBranch) return normalizedRawBranch;

  const normalizedSheetName = normalizeText(sourceSheet);
  if (normalizedSheetName === '中国区') {
    return SHENZHEN_HEADQUARTERS;
  }

  return resolveOfficialBranchByName(contractorName) || resolveBranchByLocation(contractorName) || '';
}

export function resolveContractorFilterValue(contractorName) {
  const normalized = normalizeText(contractorName);
  return normalized || NO_CONTRACTOR_LABEL;
}

function buildBranchNameMatchers() {
  const matchers = [];
  OFFICIAL_BRANCHES.forEach((branch) => {
    matchers.push({ branch, token: branch });
    const shortName = branch.replace(/分公司$/u, '');
    if (shortName && shortName !== branch && shortName.length >= 2) {
      matchers.push({ branch, token: shortName });
    }
  });
  Object.entries(BRANCH_ALIASES).forEach(([alias, branch]) => {
    matchers.push({ branch, token: alias });
    const shortName = alias.replace(/分公司$/u, '');
    if (shortName && shortName !== alias && shortName.length >= 2) {
      matchers.push({ branch, token: shortName });
    }
  });
  return matchers.sort((left, right) => right.token.length - left.token.length);
}

function resolveOfficialBranchByName(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const matched = BRANCH_NAME_MATCHERS.find(({ token }) => text.includes(token));
  return matched?.branch || '';
}

function resolveBranchByLocation(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const matchedRule = LOCATION_TOKEN_MATCHERS.find((rule) => text.includes(rule.token));
  return matchedRule?.branch || '';
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, '')
    .trim();
}
