import { useState } from 'react';
import type { FaqItem } from '../../data/faqData';

/**
 * Accordion 1 cột cho FAQ — mở/đóng từng mục, mặc định mục đầu mở.
 */
export default function Accordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(items[0]?.id ?? null);

  return (
    <div className="tw-flex tw-flex-col tw-gap-3">
      {items.map((it, i) => {
        const isOpen = open === it.id;
        return (
          <div
            key={it.id}
            className={`tw-overflow-hidden tw-rounded-xl tw-border tw-bg-white tw-transition-colors ${
              isOpen ? 'tw-border-gold/50 tw-shadow-[0_4px_18px_rgba(0,0,0,0.06)]' : 'tw-border-neutral-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : it.id)}
              className="tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-gap-3 tw-px-5 tw-py-4 tw-text-left"
            >
              <span className="tw-flex tw-h-7 tw-w-7 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-gold/15 tw-text-[13px] tw-font-bold tw-text-gold-dark">
                {i + 1}
              </span>
              <span className="tw-flex-1 tw-text-[15px] tw-font-semibold tw-text-ink">{it.question}</span>
              <i className={`bi bi-chevron-down tw-text-[13px] tw-text-neutral-400 tw-transition-transform ${isOpen ? 'tw-rotate-180' : ''}`} />
            </button>
            <div
              className={`tw-grid tw-transition-all tw-duration-300 ${isOpen ? 'tw-grid-rows-[1fr]' : 'tw-grid-rows-[0fr]'}`}
            >
              <div className="tw-overflow-hidden">
                <p className="tw-px-5 tw-pb-4 tw-pl-[60px] tw-text-[14px] tw-leading-relaxed tw-text-neutral-600">
                  {it.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
