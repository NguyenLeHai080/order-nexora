/** Màu badge theo HTTP method. */
const METHOD_COLOR: Record<string, string> = {
  GET: 'info', POST: 'success', PUT: 'warning', PATCH: 'warning', DELETE: 'danger',
};

export function methodColor(method: string): string {
  return METHOD_COLOR[method] ?? 'secondary';
}

/** Màu badge theo HTTP status code. */
export function statusColor(code: number): string {
  if (code >= 500) return 'danger';
  if (code >= 400) return 'warning';
  if (code >= 200 && code < 300) return 'success';
  return 'secondary';
}
