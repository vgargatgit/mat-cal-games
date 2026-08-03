const ENABLED_VALUES = new Set(['1', 'true', 'on']);

/** Debug mode is explicit, URL-scoped, and never persisted into learner progress. */
export function debugModeFromSearch(search = '') {
  try {
    return ENABLED_VALUES.has(new URLSearchParams(search).get('debug')?.toLowerCase());
  } catch {
    return false;
  }
}

export function withoutDebugMode(url) {
  const next = new URL(url);
  next.searchParams.delete('debug');
  next.hash = '#/map';
  return next.toString();
}
