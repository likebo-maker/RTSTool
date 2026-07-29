import { applyPointOffsets } from '../services/geoCacheService';
import { resolveBranchGeo } from './branchGeoMap';
import {
  buildTrainingConstructionDashboard,
  collectTrainingConstructionOptions,
  createAllTrainingConstructionFilters
} from './trainingConstructionAggregator';
import {
  buildInternationalTrainingConstructionDashboard,
  collectInternationalTrainingConstructionOptions,
  createAllInternationalTrainingConstructionFilters
} from './internationalTrainingConstructionAggregator';
import {
  getInternationalTrainingCenterTypeStyle,
  normalizeInternationalTrainingConstructionRecords
} from './internationalTrainingConstructionConfig';
import { createInternationalQualificationPointSizer } from './internationalQualificationMapSizing';
import {
  buildTrainingDashboard,
  collectTrainingOptions,
  createAllTrainingFilters
} from './trainingAggregator';
import {
  buildInternationalTrainingDeliveryDashboard,
  collectInternationalTrainingDeliveryOptions,
  createAllInternationalTrainingDeliveryFilters
} from './internationalTrainingDeliveryAggregator';
import { normalizeInternationalTrainingDeliveryRecords } from './internationalTrainingDeliveryConfig';
import globalTrainingCenterAliases from '../data/globalTrainingCenterAliases.json';

export function buildGlobalServiceSnapshot(chinaSource = [], internationalDashboard = null) {
  const china = Array.isArray(chinaSource)
    ? buildChinaServiceSnapshot(chinaSource)
    : buildChinaServiceSnapshotFromAggregate(chinaSource);
  const internationalSummary = internationalDashboard?.summary || {};
  const internationalMapPoints = internationalDashboard?.mapPoints || [];
  const internationalPointSizer = createInternationalQualificationPointSizer(internationalMapPoints);
  const internationalPoints = internationalMapPoints.map((point) => ({
    id: `international-service:${point.country}`,
    name: point.country,
    source: 'International',
    sources: ['International'],
    country: point.country,
    region: point.secondaryRegion || '',
    location: point.capital ? `${point.capital}, ${point.country}` : point.country,
    coords: point.coords,
    value: Number(point.validQualifications || 0),
    validQualifications: Number(point.validQualifications || 0),
    // Use the same square-root area scale as the standalone International
    // qualification map so the visual quantity has one consistent meaning.
    markerSize: internationalPointSizer(point),
    status: point.riskLevel || 'Normal',
    metrics: [
      { label: 'Certified Engineers', value: point.totalPeople || 0 },
      { label: 'Valid Qualifications', value: point.validQualifications || 0 },
      { label: 'Expired Qualifications', value: point.expiredQualifications || 0 },
      { label: 'Covered Partners', value: point.coveredPartners || 0 }
    ]
  }));

  const points = applyPointOffsets([...china.points, ...internationalPoints]);
  return {
    points,
    metrics: [
      { label: 'Certified Engineers', value: china.summary.totalPeople + Number(internationalSummary.totalPeople || 0), tone: 'blue' },
      { label: 'Valid Qualifications', value: china.summary.validQualifications + Number(internationalSummary.validQualifications || 0), tone: 'cyan' },
      { label: 'Covered Countries', value: Number(internationalSummary.coveredCountries || 0) + (china.recordCount ? 1 : 0), tone: 'green' },
      { label: 'Service Locations', value: china.points.length + internationalPoints.length, tone: 'violet' },
      { label: 'Covered Partners', value: china.summary.coveredPartners + Number(internationalSummary.coveredPartners || 0), tone: 'orange' }
    ],
    rankingTitle: 'Valid Qualification TOP10',
    rankingMetricLabel: 'valid qualifications'
  };
}

export function buildGlobalConstructionSnapshot(chinaRecords = [], internationalRecords = []) {
  const chinaDashboard = buildChinaConstructionDashboard(chinaRecords);
  // Global snapshots can read datasets saved before parser rules changed.
  // Normalize first so shared-map counts use the latest contract definitions.
  const internationalDashboard = buildInternationalConstructionDashboard(normalizeInternationalTrainingConstructionRecords(internationalRecords));
  const mergedCenters = new Map();

  chinaDashboard.mapPoints.forEach((point) => mergeConstructionCenter(mergedCenters, {
    name: point.centerName,
    source: 'China',
    country: 'China',
    region: point.mappedRegion || '',
    city: point.city || point.province || '',
    location: [point.city || point.province, 'China'].filter(Boolean).join(', '),
    coords: point.coords,
    courseNames: point.courseNames || [],
    productLines: point.productLines || [],
    relationCount: point.relationCount || 0,
    contractStatus: 'Not applicable',
    markerColor: '#60a5fa',
    markerLegendKey: 'china-center',
    markerLegendLabel: 'China Training Center'
  }));
  internationalDashboard.mapPoints.forEach((point) => {
    const centerTypeStyle = getInternationalTrainingCenterTypeStyle(point.centerType);
    mergeConstructionCenter(mergedCenters, {
      name: point.centerName,
      source: 'International',
      country: point.country || '',
      region: point.secondaryRegion || '',
      city: point.city || point.capital || '',
      location: point.displayLocation || [point.city || point.capital, point.country].filter(Boolean).join(', '),
      coords: point.coords,
      courseNames: point.courseNames || [],
      productLines: point.productLines || [],
      relationCount: point.relationCount || 0,
      contractStatus: point.contractStatus || 'Status not maintained',
      isSigned: Boolean(point.isSigned),
      isInternal: Boolean(point.isInternal),
      centerType: point.centerType || '',
      markerColor: centerTypeStyle.color,
      markerLegendKey: `international-${centerTypeStyle.key}`,
      markerLegendLabel: centerTypeStyle.label
    });
  });

  const points = applyPointOffsets([...mergedCenters.values()].map(finalizeConstructionCenter));
  return {
    points,
    metrics: [
      { label: 'Total Training Centers', value: points.length, tone: 'blue' },
      { label: 'China Centers', value: chinaDashboard.summary.totalCenters || 0, tone: 'cyan' },
      { label: 'International Centers', value: internationalDashboard.summary.totalCenters || 0, tone: 'violet' },
      { label: 'Signed International Centers', value: internationalDashboard.summary.signedCenters || 0, tone: 'green' },
      { label: 'Unsigned International Centers', value: internationalDashboard.summary.unsignedCenters || 0, tone: 'orange' },
      { label: 'Internal International Centers', value: internationalDashboard.summary.internalCenters || 0, tone: 'violet' }
    ],
    legendTitle: 'Training Center Type',
    rankingTitle: 'Center Course Coverage TOP10',
    rankingMetricLabel: 'courses'
  };
}

export function buildGlobalDeliverySnapshot(chinaRecords = [], internationalRecords = []) {
  const chinaDashboard = buildChinaDeliveryDashboard(chinaRecords);
  // Delivery points now use Training Location as their center identity. Apply
  // that migration here so saved data is corrected without a fresh import.
  const internationalDashboard = buildInternationalDeliveryDashboard(normalizeInternationalTrainingDeliveryRecords(internationalRecords));
  const mergedPoints = new Map();

  chinaDashboard.mapPoints.forEach((point) => mergeDeliveryPoint(mergedPoints, {
    name: point.trainingCenter || point.branch,
    source: 'China',
    country: 'China',
    region: point.mappedRegion || '',
    city: point.city || point.trainingCenterCity || '',
    location: [point.city || point.trainingCenterCity, 'China'].filter(Boolean).join(', '),
    coords: point.coords,
    recordCount: point.recordCount || 0,
    traineeCount: point.traineeCount || 0,
    sessionCount: point.sessionCount || 0,
    failCount: point.failCount || 0,
    passRate: point.passRate || '-',
    passRateValue: point.passRateValue
  }));
  internationalDashboard.mapPoints.forEach((point) => mergeDeliveryPoint(mergedPoints, {
    name: point.matchedConstructionCenter || point.organizer,
    source: 'International',
    country: point.country || '',
    region: point.secondaryRegion || '',
    city: point.city || point.capital || '',
    location: point.displayLocation || point.trainingLocation || point.country,
    coords: point.coords,
    recordCount: point.recordCount || 0,
    traineeCount: point.traineeCount || 0,
    sessionCount: point.sessionCount || 0,
    failCount: point.failCount || 0,
    passRate: point.passRate || '-',
    passRateValue: point.passRateValue
  }));

  const finalizedPoints = [...mergedPoints.values()].map(finalizeDeliveryPoint);
  const internationalPointSizer = createInternationalQualificationPointSizer(
    finalizedPoints.filter((point) => point.sources.includes('International')),
    { valueField: 'recordCount' }
  );
  const points = applyPointOffsets(finalizedPoints.map((point) => (
    point.sources.includes('International')
      ? { ...point, markerSize: internationalPointSizer(point) }
      : point
  )));
  const allRecords = [...chinaRecords, ...internationalRecords];
  const effectiveRecords = allRecords.filter((record) => record.isEffectiveResult);
  const passCount = effectiveRecords.filter((record) => record.isPass).length;
  const traineeCount = countGlobalTrainees(chinaRecords, internationalRecords);
  const sessionCount = countGlobalSessions(chinaRecords, internationalRecords);
  const failCount = allRecords.filter((record) => record.isFail).length;
  const sourceLegendItems = [
    buildDeliverySourceLegendItem('China', '#22d3ee', chinaRecords),
    buildDeliverySourceLegendItem('International', '#a78bfa', internationalRecords)
  ];

  return {
    points,
    metrics: [
      { label: 'Training Records', value: allRecords.length, tone: 'blue' },
      { label: 'Trainees', value: traineeCount, tone: 'cyan' },
      { label: 'Training Sessions', value: sessionCount, tone: 'violet' },
      { label: 'Pass Rate', value: effectiveRecords.length ? `${((passCount / effectiveRecords.length) * 100).toFixed(1)}%` : '-', tone: 'green' },
      { label: 'Failed Records', value: failCount, tone: 'red' }
    ],
    legendTitle: 'Delivery Data Source',
    legendItems: sourceLegendItems,
    rankingTitle: 'Training Delivery TOP10',
    rankingMetricLabel: 'training records'
  };
}

function buildChinaServiceSnapshot(records) {
  const people = new Set();
  const partners = new Set();
  const branches = new Map();
  let validQualifications = 0;

  records.forEach((record) => {
    const branchName = String(record.branch || '').trim();
    if (!branchName) return;
    const personKey = qualificationPersonKey(record);
    if (personKey) people.add(personKey);
    if (record.isCurrentlyValid) validQualifications += 1;
    if (record.isChannelPartner && record.contractorName) partners.add(String(record.contractorName).trim());

    const stat = branches.get(branchName) || {
      branchName,
      region: record.mappedRegion || '',
      people: new Set(),
      validQualifications: 0,
      expiredQualifications: 0,
      expiring30: 0,
      expiring60: 0,
      coveredPartners: new Set(),
      totalRecords: 0
    };
    stat.totalRecords += 1;
    if (personKey) stat.people.add(personKey);
    if (record.isCurrentlyValid) stat.validQualifications += 1;
    if (record.qualificationStatus === '已过期') stat.expiredQualifications += 1;
    if (record.qualificationStatus === '30天内到期') stat.expiring30 += 1;
    if (record.qualificationStatus === '60天内到期') stat.expiring60 += 1;
    if (record.isChannelPartner && record.contractorName) stat.coveredPartners.add(String(record.contractorName).trim());
    branches.set(branchName, stat);
  });

  const points = [...branches.values()].map((stat) => {
    const geo = resolveBranchGeo(stat.branchName);
    if (!geo?.coords) return null;
    const risk = serviceRisk(stat);
    return {
      id: `china-service:${stat.branchName}`,
      name: stat.branchName,
      source: 'China',
      sources: ['China'],
      country: 'China',
      region: stat.region,
      location: [geo.city, 'China'].filter(Boolean).join(', '),
      coords: geo.coords,
      value: stat.validQualifications,
      status: risk,
      metrics: [
        { label: 'Certified Engineers', value: stat.people.size },
        { label: 'Valid Qualifications', value: stat.validQualifications },
        { label: 'Expired Qualifications', value: stat.expiredQualifications },
        { label: 'Covered Partners', value: stat.coveredPartners.size }
      ]
    };
  }).filter(Boolean);

  return {
    points,
    summary: {
      totalPeople: people.size,
      validQualifications,
      coveredPartners: partners.size
    },
    recordCount: records.length
  };
}

function buildChinaServiceSnapshotFromAggregate(snapshot = {}) {
  const points = (snapshot.branchStats || []).map((stat) => {
    const geo = resolveBranchGeo(stat.branchName);
    if (!geo?.coords) return null;
    return {
      id: `china-service:${stat.branchName}`,
      name: stat.branchName,
      source: 'China',
      sources: ['China'],
      country: 'China',
      region: stat.region || '',
      location: [geo.city, 'China'].filter(Boolean).join(', '),
      coords: geo.coords,
      value: Number(stat.validQualifications || 0),
      status: serviceRisk(stat),
      metrics: [
        { label: 'Certified Engineers', value: stat.peopleCount || 0 },
        { label: 'Valid Qualifications', value: stat.validQualifications || 0 },
        { label: 'Expired Qualifications', value: stat.expiredQualifications || 0 },
        { label: 'Covered Partners', value: stat.coveredPartners || 0 }
      ]
    };
  }).filter(Boolean);
  return {
    points,
    summary: {
      totalPeople: Number(snapshot.summary?.totalPeople || 0),
      validQualifications: Number(snapshot.summary?.validQualifications || 0),
      coveredPartners: Number(snapshot.summary?.coveredPartners || 0)
    },
    recordCount: Number(snapshot.recordCount || 0)
  };
}

function buildChinaConstructionDashboard(records) {
  if (!records.length) return emptyConstructionDashboard();
  const options = collectTrainingConstructionOptions(records);
  return buildTrainingConstructionDashboard(records, createAllTrainingConstructionFilters(options));
}

function buildInternationalConstructionDashboard(records) {
  if (!records.length) return emptyConstructionDashboard();
  const options = collectInternationalTrainingConstructionOptions(records);
  return buildInternationalTrainingConstructionDashboard(records, createAllInternationalTrainingConstructionFilters(options));
}

function buildChinaDeliveryDashboard(records) {
  if (!records.length) return emptyDeliveryDashboard();
  const options = collectTrainingOptions(records);
  return buildTrainingDashboard(records, createAllTrainingFilters(options));
}

function buildInternationalDeliveryDashboard(records) {
  if (!records.length) return emptyDeliveryDashboard();
  const options = collectInternationalTrainingDeliveryOptions(records);
  return buildInternationalTrainingDeliveryDashboard(records, createAllInternationalTrainingDeliveryFilters(options));
}

function mergeConstructionCenter(target, center) {
  if (!center.name || !Array.isArray(center.coords)) return;
  const key = centerIdentity(center);
  const current = target.get(key) || {
    id: `construction:${key}`,
    name: center.name,
    country: center.country,
    region: center.region,
    city: center.city,
    location: center.location,
    coords: center.coords,
    sources: new Set(),
    courseNames: new Set(),
    productLines: new Set(),
    relationCount: 0,
    contractStatuses: new Set(),
    isSigned: false,
    isInternal: false,
    centerType: '',
    markerColor: '',
    markerLegendKey: '',
    markerLegendLabel: ''
  };
  current.sources.add(center.source);
  center.courseNames.forEach((value) => value && current.courseNames.add(value));
  center.productLines.forEach((value) => value && current.productLines.add(value));
  current.relationCount += Number(center.relationCount || 0);
  if (center.contractStatus) current.contractStatuses.add(center.contractStatus);
  current.isSigned = current.isSigned || Boolean(center.isSigned);
  current.isInternal = current.isInternal || Boolean(center.isInternal);
  // A center can theoretically be shared by both sources. International
  // center type takes precedence because that is the dimension encoded by
  // color on the global construction map.
  if (center.source === 'International' || !current.markerColor) {
    current.centerType = center.centerType || current.centerType;
    current.markerColor = center.markerColor || current.markerColor;
    current.markerLegendKey = center.markerLegendKey || current.markerLegendKey;
    current.markerLegendLabel = center.markerLegendLabel || current.markerLegendLabel;
  }
  target.set(key, current);
}

function finalizeConstructionCenter(center) {
  const sources = [...center.sources];
  const source = sources.length > 1 ? 'Combined' : sources[0];
  return {
    ...center,
    source,
    sources,
    value: center.courseNames.size,
    status: center.isSigned ? 'Signed' : center.isInternal ? 'Internal (Mindray)' : [...center.contractStatuses].join(', '),
    metrics: [
      { label: 'Courses', value: center.courseNames.size },
      { label: 'Product Lines', value: center.productLines.size },
      { label: 'Center-Course Relations', value: center.relationCount },
      { label: 'Contract Status', value: center.isSigned ? 'Signed' : center.isInternal ? 'Internal (Mindray)' : [...center.contractStatuses].join(', ') || 'Not maintained' }
    ]
  };
}

function mergeDeliveryPoint(target, point) {
  if (!point.name || !Array.isArray(point.coords)) return;
  const alias = resolveGlobalDeliveryCenterAlias(point);
  const key = alias ? `alias:${alias.key}` : centerIdentity(point);
  const current = target.get(key) || {
    id: `delivery:${key}`,
    name: alias?.displayName || point.name,
    country: point.country,
    region: point.region,
    city: point.city,
    location: point.location,
    coords: point.coords,
    sources: new Set(),
    recordCount: 0,
    traineeCount: 0,
    sessionCount: 0,
    failCount: 0,
    passRates: [],
    sourceStats: new Map(),
    markerColor: ''
  };
  current.sources.add(point.source);
  current.recordCount += Number(point.recordCount || 0);
  current.traineeCount += Number(point.traineeCount || 0);
  current.sessionCount += Number(point.sessionCount || 0);
  current.failCount += Number(point.failCount || 0);
  if (Number.isFinite(point.passRateValue)) current.passRates.push({ value: point.passRateValue, weight: Math.max(1, point.recordCount || 0) });
  const sourceStat = current.sourceStats.get(point.source) || { recordCount: 0, sessionCount: 0 };
  sourceStat.recordCount += Number(point.recordCount || 0);
  sourceStat.sessionCount += Number(point.sessionCount || 0);
  current.sourceStats.set(point.source, sourceStat);

  // China is the governed display source for explicitly merged Wuhan and
  // Shenzhen points. It supplies the coordinate, location text, and cyan color.
  if (alias && point.source === 'China') {
    current.country = point.country;
    current.region = point.region;
    current.city = point.city;
    current.location = point.location;
    current.coords = point.coords;
    current.markerColor = '#22d3ee';
  }
  target.set(key, current);
}

function finalizeDeliveryPoint(point) {
  const sources = [...point.sources];
  const source = sources.length > 1 ? 'Combined' : sources[0];
  const totalWeight = point.passRates.reduce((sum, item) => sum + item.weight, 0);
  const passRateValue = totalWeight
    ? point.passRates.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight
    : null;
  const sourceBreakdown = sources
    .map((sourceName) => {
      const stat = point.sourceStats.get(sourceName) || {};
      return `${sourceName}: ${Number(stat.sessionCount || 0).toLocaleString('en-US')} sessions / ${Number(stat.recordCount || 0).toLocaleString('en-US')} attendance`;
    })
    .join('; ');
  return {
    ...point,
    source,
    sources,
    sourceBreakdown,
    value: point.recordCount,
    status: passRateValue === null ? 'No assessed result' : `${passRateValue.toFixed(1)}% pass rate`,
    metrics: [
      { label: 'Training Records', value: point.recordCount },
      { label: 'Trainees', value: point.traineeCount },
      { label: 'Training Sessions', value: point.sessionCount },
      { label: 'Failed Records', value: point.failCount }
    ]
  };
}

export function resolveGlobalDeliveryCenterAlias(point = {}) {
  const source = String(point.source || '').toLowerCase();
  const sourceField = source === 'china' ? 'china' : source === 'international' ? 'international' : '';
  if (!sourceField) return null;
  const name = normalizeIdentity(point.name);
  return (globalTrainingCenterAliases.deliveryCenters || []).find((alias) => (
    (alias[sourceField] || []).some((candidate) => normalizeIdentity(candidate) === name)
  )) || null;
}

function buildDeliverySourceLegendItem(name, color, records) {
  return {
    key: name.toLowerCase(),
    name,
    color,
    count: records.length,
    sessionCount: countSourceSessions(records),
    attendanceCount: records.length
  };
}

function countSourceSessions(records) {
  return new Set(
    (records || [])
      .map((record) => record.sessionKey || record.batchId)
      .filter(Boolean)
  ).size;
}

function qualificationPersonKey(record) {
  const employeeId = normalizeIdentity(record.employeeId);
  const personName = normalizeIdentity(record.personName);
  return employeeId || personName ? `${employeeId}|${personName}` : '';
}

function countGlobalTrainees(chinaRecords, internationalRecords) {
  const keys = new Set();
  let unknownCount = 0;
  chinaRecords.forEach((record) => {
    const account = normalizeIdentity(record.studentAccount);
    const name = normalizeIdentity(record.studentName);
    const organization = normalizeIdentity(record.studentOrg);
    if (account || name) keys.add(`${account}|${name}|${organization}`);
    else unknownCount += 1;
  });
  internationalRecords.forEach((record) => {
    const account = normalizeIdentity(record.learnerAccount);
    const name = normalizeIdentity(record.learnerName);
    if (account || name) keys.add(`${account}|${name}`);
    else unknownCount += 1;
  });
  return keys.size + unknownCount;
}

function countGlobalSessions(chinaRecords, internationalRecords) {
  const sessions = new Set();
  chinaRecords.forEach((record) => {
    const key = record.sessionKey || record.batchId;
    if (key) sessions.add(`china:${key}`);
  });
  internationalRecords.forEach((record) => {
    if (record.sessionKey) sessions.add(`international:${record.sessionKey}`);
  });
  return sessions.size;
}

function centerIdentity(center) {
  return [center.name, center.country, center.city].map(normalizeIdentity).join('|');
}

function normalizeIdentity(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function serviceRisk(stat) {
  if (stat.expiredQualifications > 0 || stat.expiring30 >= Math.max(3, Math.ceil(stat.totalRecords * 0.08))) return 'High Risk';
  if (stat.expiring30 > 0 || stat.expiring60 > 0) return 'Attention';
  return 'Normal';
}

function emptyConstructionDashboard() {
  return { summary: { totalCenters: 0, signedCenters: 0, unsignedCenters: 0, internalCenters: 0 }, mapPoints: [] };
}

function emptyDeliveryDashboard() {
  return { summary: { traineeCount: 0, recordCount: 0, sessionCount: 0, passRate: '-', failCount: 0 }, mapPoints: [] };
}
