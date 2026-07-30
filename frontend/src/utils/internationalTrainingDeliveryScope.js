export const INTERNATIONAL_DELIVERY_TOTAL_ONLY_REGION = 'CHINA';

export function isInternationalDeliveryTotalOnlyRegion(value) {
  return normalizeRegion(value) === INTERNATIONAL_DELIVERY_TOTAL_ONLY_REGION;
}

export function visibleInternationalDeliveryRegions(values) {
  return (values || []).filter((value) => !isInternationalDeliveryTotalOnlyRegion(value));
}

export function buildInternationalDeliveryRegionSelection(selectedValues, visibleOptions) {
  const options = visibleInternationalDeliveryRegions(visibleOptions).filter(Boolean);
  const optionSet = new Set(options);
  const selected = (selectedValues || []).filter((value) => optionSet.has(value));
  const selectedSet = new Set(selected);
  const allVisibleSelected = options.length > 0 && options.every((value) => selectedSet.has(value));
  return {
    hasSelection: selected.length > 0,
    allVisibleSelected,
    selectedSet
  };
}

export function matchesInternationalDeliveryRegion(recordRegion, selectedValues, visibleOptions) {
  const selection = buildInternationalDeliveryRegionSelection(selectedValues, visibleOptions);
  if (!selection.hasSelection) return false;
  // CHINA is intentionally hidden from the selector. It participates only
  // when all seven visible secondary regions are selected.
  if (selection.allVisibleSelected) return true;
  return selection.selectedSet.has(recordRegion);
}

function normalizeRegion(value) {
  return String(value || '').trim().toUpperCase();
}
