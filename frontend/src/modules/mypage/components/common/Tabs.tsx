import { useState, type ReactNode } from 'react';

export interface TabDef {
  key: string;
  label: string;
  /** Nội dung tab — render khi active. */
  render: () => ReactNode;
}

/**
 * Tab tổng quát (controlled nội bộ) — dùng cho Quy trình 4 bước, Updates trang chủ.
 * Thanh tab pill căn giữa; chỉ render nội dung tab đang active.
 */
export default function Tabs({ tabs, initialKey }: { tabs: TabDef[]; initialKey?: string }) {
  const [active, setActive] = useState(initialKey ?? tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="tw-mb-7 tw-flex tw-flex-wrap tw-justify-center tw-gap-2">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`tw-cursor-pointer tw-rounded-full tw-px-5 tw-py-2 tw-text-[13.5px] tw-font-bold tw-transition-all ${
                on
                  ? 'tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-text-black tw-shadow-[0_4px_12px_rgba(201,164,76,0.35)]'
                  : 'tw-bg-neutral-100 tw-text-neutral-600 hover:tw-bg-neutral-200'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div>{current?.render()}</div>
    </div>
  );
}
