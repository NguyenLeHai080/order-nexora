/**
 * Card cảm nhận khách hàng — ảnh tròn + tên + nghề + dịch vụ + trích dẫn.
 */
import type { Testimonial } from '../../data/servicesData';

export default function TestimonialCard({ data }: { data: Testimonial }) {
  return (
    <article className="tw-flex tw-h-full tw-flex-col tw-rounded-2xl tw-border tw-border-neutral-200 tw-bg-white tw-p-6 tw-shadow-sm">
      <i className="bi bi-quote tw-mb-3 tw-text-[34px] tw-leading-none tw-text-gold/40" />
      <p className="tw-flex-1 tw-text-[14px] tw-leading-relaxed tw-text-neutral-600">“{data.quote}”</p>
      <div className="tw-mt-5 tw-flex tw-items-center tw-gap-3 tw-border-t tw-border-neutral-100 tw-pt-4">
        <img src={data.avatar} alt={data.name} className="tw-h-11 tw-w-11 tw-rounded-full tw-object-cover" />
        <div>
          <p className="tw-text-[14px] tw-font-bold tw-text-ink">{data.name}</p>
          <p className="tw-text-[12.5px] tw-text-neutral-400">
            {data.role} · <span className="tw-text-gold-dark">{data.service}</span>
          </p>
        </div>
      </div>
    </article>
  );
}
