// ─── URL State helpers ─────────────────────────────────────────────
// Read/write selected artist IDs and view mode from URL query params

export function getSelectedIdsFromURL(): Set<string> {
  const params = new URLSearchParams(window.location.search);
  const ids = params.get('ids');
  if (!ids) return new Set();
  return new Set(ids.split(',').filter(Boolean));
}

export function isReadOnlyFromURL(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('view') === 'shared';
}

export function isShowOnlySelectedFromURL(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('filter') === 'selected';
}

export function updateURL(
  ids: Set<string>,
  readOnly: boolean,
  showOnlySelected: boolean
) {
  const url = new URL(window.location.href);
  if (ids.size > 0) {
    url.searchParams.set('ids', [...ids].join(','));
  } else {
    url.searchParams.delete('ids');
  }
  if (readOnly) {
    url.searchParams.set('view', 'shared');
  } else {
    url.searchParams.delete('view');
  }
  if (showOnlySelected && ids.size > 0) {
    url.searchParams.set('filter', 'selected');
  } else {
    url.searchParams.delete('filter');
  }
  window.history.replaceState({}, '', url.toString());
}
