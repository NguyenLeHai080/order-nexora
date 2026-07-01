import { useSmartNav } from './useSmartNav';

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Breadcrumb "Trang chủ / X" — mục cuối không có link.
 * href dùng useSmartNav (route + hash).
 */
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  const nav = useSmartNav();
  const all: Crumb[] = [{ label: 'Trang chủ', href: '/' }, ...items];
  return (
    <nav className="tw-flex tw-flex-wrap tw-items-center tw-gap-1.5 tw-text-[13px] tw-text-neutral-500">
      {all.map((c, i) => {
        const last = i === all.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="tw-flex tw-items-center tw-gap-1.5">
            {c.href && !last ? (
              <button
                type="button"
                onClick={() => nav(c.href!)}
                className="tw-cursor-pointer tw-transition-colors hover:tw-text-gold-dark"
              >
                {c.label}
              </button>
            ) : (
              <span className={last ? 'tw-font-semibold tw-text-ink' : ''}>{c.label}</span>
            )}
            {!last && <i className="bi bi-chevron-right tw-text-[9px] tw-text-neutral-300" />}
          </span>
        );
      })}
    </nav>
  );
}
