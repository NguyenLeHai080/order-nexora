import { PROCESS_STEPS } from '../../data/servicesData';
import Tabs from '../common/Tabs';

/**
 * Section "Quy trình chuẩn" trang chủ — Tabs 4 bước (style ufotech.vn). Mỗi tab
 * hiện ảnh + mô tả bước.
 */
export default function HomeProcess() {
  return (
    <section className="mp-section">
      <div className="mp-container">
        <div className="mp-head reveal">
          <span className="mp-eyebrow">Quy trình</span>
          <h2 className="mp-title">Mua hàng chỉ với 4 bước đơn giản</h2>
          <p className="mp-subtitle">Nhanh chóng, minh bạch — từ lúc chọn dịch vụ đến khi nhận bàn giao.</p>
        </div>

        <Tabs
          tabs={PROCESS_STEPS.map((s) => ({
            key: String(s.id),
            label: s.step,
            render: () => (
              <div className="tw-grid tw-items-center tw-gap-8 lg:tw-grid-cols-2">
                <div className="tw-overflow-hidden tw-rounded-2xl tw-shadow-[0_14px_36px_rgba(0,0,0,0.12)]">
                  <img src={s.image} alt={s.title} className="tw-w-full tw-object-cover" />
                </div>
                <div>
                  <span className="tw-inline-block tw-rounded-full tw-bg-gold/12 tw-px-3 tw-py-1 tw-text-[12.5px] tw-font-bold tw-text-gold-dark">
                    {s.step}
                  </span>
                  <h3 className="tw-mt-3 tw-text-[22px] tw-font-extrabold tw-text-ink">{s.title}</h3>
                  <p className="tw-mt-3 tw-text-[14.5px] tw-leading-relaxed tw-text-neutral-600">{s.desc}</p>
                </div>
              </div>
            ),
          }))}
        />
      </div>
    </section>
  );
}
