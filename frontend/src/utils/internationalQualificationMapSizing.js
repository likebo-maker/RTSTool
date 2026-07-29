const DEFAULT_MIN_SIZE = 12;
const DEFAULT_MAX_SIZE = 34;

/**
 * Builds an ECharts symbol-size function for country qualification points.
 *
 * ECharts receives diameter, while users perceive circle area. Square-root
 * scaling therefore keeps the visible area proportional to valid qualification
 * quantity and still leaves low-volume countries easy to click.
 */
export function createInternationalQualificationPointSizer(points = [], options = {}) {
  const valueAccessor = typeof options.valueAccessor === 'function'
    ? options.valueAccessor
    : (point) => point?.[options.valueField || 'validQualifications'];
  const counts = points
    .map((point) => toNonNegativeNumber(valueAccessor(point)))
    .filter((value) => value > 0);
  const minimumCount = counts.length ? Math.min(...counts) : 0;
  const maximumCount = counts.length ? Math.max(...counts) : 0;
  const minimumSize = Number(options.minimumSize) || DEFAULT_MIN_SIZE;
  const maximumSize = Math.max(minimumSize, Number(options.maximumSize) || DEFAULT_MAX_SIZE);

  return (point, state = {}) => {
    const count = toNonNegativeNumber(valueAccessor(point));
    let size = minimumSize;
    if (maximumCount > minimumCount && count > 0) {
      const minimumRoot = Math.sqrt(minimumCount);
      const maximumRoot = Math.sqrt(maximumCount);
      const ratio = (Math.sqrt(count) - minimumRoot) / (maximumRoot - minimumRoot);
      size = minimumSize + Math.max(0, Math.min(1, ratio)) * (maximumSize - minimumSize);
    } else if (count > 0) {
      size = (minimumSize + maximumSize) / 2;
    }

    if (state.focused) return Math.min(maximumSize + 8, size + 8);
    if (state.selected) return Math.min(maximumSize + 4, size + 4);
    return size;
  };
}

function toNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
