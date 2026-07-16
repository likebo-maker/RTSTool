import { getQualificationRegionGroups } from './branchGeoMap';

export const SHENZHEN_HEADQUARTERS = '深圳总部（内部）';
export const NO_CONTRACTOR_LABEL = '中国区（非渠道商）';
export const UNMATCHED_BRANCH = '未匹配分公司';

const OFFICIAL_BRANCHES = getQualificationRegionGroups().flatMap((region) => region.branches);
const OFFICIAL_BRANCH_SET = new Set(OFFICIAL_BRANCHES);

const BRANCH_ALIASES = {
  总部: SHENZHEN_HEADQUARTERS,
  深圳总部: SHENZHEN_HEADQUARTERS,
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

export function normalizeQualificationBranchName(value) {
  const text = normalizeText(value);
  if (!text) return '';
  if (OFFICIAL_BRANCH_SET.has(text)) return text;
  if (BRANCH_ALIASES[text]) return BRANCH_ALIASES[text];
  return resolveOfficialBranchByName(text);
}

export function resolveQualificationBranch({ rawBranch } = {}) {
  const normalizedRawBranch = normalizeQualificationBranchName(rawBranch);
  if (normalizedRawBranch) return normalizedRawBranch;
  return '';
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

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, '')
    .trim();
}
