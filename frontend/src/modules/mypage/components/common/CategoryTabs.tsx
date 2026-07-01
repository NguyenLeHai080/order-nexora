/**
 * Tab lọc danh mục có số đếm (dùng cho Dịch vụ / Thủ thuật / Tin tức).
 * Pill bo tròn, active = gradient gold. Điều khiển bằng state ngoài (controlled).
 */
export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

export default function CategoryTabs({
  items,
  active,
  onChange,
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="tw-flex tw-flex-wrap tw-justify-center tw-gap-2">
      {items.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`tw-cursor-pointer tw-rounded-full tw-border tw-px-4 tw-py-1.5 tw-text-[13px] tw-font-semibold tw-transition-all ${
              on
                ? 'tw-border-gold tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-text-black tw-shadow-[0_4px_12px_rgba(201,164,76,0.35)]'
                : 'tw-border-neutral-300 tw-bg-white tw-text-neutral-600 hover:tw-border-gold hover:tw-text-gold-dark'
            }`}
          >
            {t.label}
            {typeof t.count === 'number' && <span className="tw-ml-1 tw-opacity-50">({t.count})</span>}
          </button>
        );
      })}
    </div>
  );
}
