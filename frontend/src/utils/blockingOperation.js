const DEFAULT_MINIMUM_VISIBLE_MS = 900;

export function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function waitForBrowserPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
}

export async function runWithMinimumVisibleTime(action, minimumVisibleMs = DEFAULT_MINIMUM_VISIBLE_MS) {
  const startedAt = Date.now();
  await waitForBrowserPaint();
  try {
    return await action();
  } finally {
    const remaining = minimumVisibleMs - (Date.now() - startedAt);
    if (remaining > 0) {
      await wait(remaining);
    }
  }
}
