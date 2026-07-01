/**
 * Card dịch vụ — style ufotech.vn: thumbnail trên, nhãn danh mục, tiêu đề,
 * ngày + đoạn teaser, CTA "Xem thêm". Không hiển thị giá (đúng ufotech).
 */
import { useSmartNav } from '../layout/useSmartNav';

export interface ServiceCardData {
  categoryLabel: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  href: string;
}

export default function ServiceCard({ data }: { data: ServiceCardData }) {
  const nav = useSmartNav();
  return (
    <article className="tw-group tw-flex tw-flex-col tw-overflow-hidden tw-rounded-2xl tw-border tw-border-neutral-200 tw-bg-white tw-shadow-sm tw-transition-all tw-duration-300 hover:-tw-translate-y-1 hover:tw-shadow-[0_12px_32px_rgba(0,0,0,0.1)]">
      <button type="button" onClick={() => nav(data.href)} className="tw-block tw-cursor-pointer tw-overflow-hidden">
        <div className="tw-aspect-[16/10] tw-overflow-hidden">
          <img
            src={data.image}
            alt={data.title}
            loading="lazy"
            className="tw-h-full tw-w-full tw-object-cover tw-transition-transform tw-duration-500 group-hover:tw-scale-105"
          />
        </div>
      </button>
      <div className="tw-flex tw-flex-1 tw-flex-col tw-p-5">
        <span className="tw-mb-2 tw-inline-flex tw-w-fit tw-items-center tw-gap-1 tw-rounded-full tw-bg-gold/10 tw-px-2.5 tw-py-[3px] tw-text-[11.5px] tw-font-bold tw-text-gold-dark">
          {data.categoryLabel}
        </span>
        <h3
          onClick={() => nav(data.href)}
          className="tw-cursor-pointer tw-text-[16px] tw-font-bold tw-leading-snug tw-text-ink tw-transition-colors group-hover:tw-text-gold-dark"
        >
          {data.title}
        </h3>
        <span className="tw-mt-1.5 tw-text-[12.5px] tw-text-neutral-400">
          <i className="bi bi-calendar3 tw-mr-1" />{data.date}
        </span>
        <p className="tw-mt-2 tw-line-clamp-2 tw-text-[13.5px] tw-leading-relaxed tw-text-neutral-500">{data.excerpt}</p>
        <button
          type="button"
          onClick={() => nav(data.href)}
          className="tw-mt-4 tw-inline-flex tw-w-fit tw-cursor-pointer tw-items-center tw-gap-1.5 tw-text-[13.5px] tw-font-semibold tw-text-gold-dark tw-transition-colors hover:tw-gap-2.5"
        >
          Xem thêm <i className="bi bi-arrow-right" />
        </button>
      </div>
    </article>
  );
}
