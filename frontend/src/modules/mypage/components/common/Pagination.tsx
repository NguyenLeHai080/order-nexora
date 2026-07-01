/**
 * Phân trang dạng số (1 … N) + mũi tên. Tĩnh — chỉ điều khiển state trang hiện
 * tại (dữ liệu thật nối sau). Tự rút gọn khi nhiều trang (… ellipsis).
 */
export default function Pagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total <= 1) return null;

  // Tập trang hiển thị: luôn có 1, current-1..current+1, total + ellipsis.
  const pages: (number | '...')[] = [];
  const push = (p: number | '...') => pages.push(p);
  const window = new Set<number>([1, total, current - 1, current, current + 1]);
  let prev = 0;
  for (let p = 1; p <= total; p++) {
    if (window.has(p) && p >= 1 && p <= total) {
      if (prev && p - prev > 1) push('...');
      push(p);
      prev = p;
    }
  }

  const btn =
    'tw-flex tw-h-9 tw-min-w-[36px] tw-items-center tw-justify-center tw-rounded-lg tw-border tw-px-2 tw-text-[13.5px] tw-font-semibold tw-transition-colors';

  return (
    <nav className="tw-mt-10 tw-flex tw-items-center tw-justify-center tw-gap-1.5">
      <button
        type="button"
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
        className={`${btn} tw-border-neutral-300 tw-text-neutral-600 hover:tw-border-gold hover:tw-text-gold-dark disabled:tw-cursor-not-allowed disabled:tw-opacity-40`}
        aria-label="Trang trước"
      >
        <i className="bi bi-chevron-left" />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="tw-px-1 tw-text-neutral-400">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`${btn} ${
              p === current
                ? 'tw-border-gold tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-text-black'
                : 'tw-border-neutral-300 tw-text-neutral-600 hover:tw-border-gold hover:tw-text-gold-dark'
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        disabled={current >= total}
        onClick={() => onChange(current + 1)}
        className={`${btn} tw-border-neutral-300 tw-text-neutral-600 hover:tw-border-gold hover:tw-text-gold-dark disabled:tw-cursor-not-allowed disabled:tw-opacity-40`}
        aria-label="Trang sau"
      >
        <i className="bi bi-chevron-right" />
      </button>
    </nav>
  );
}
