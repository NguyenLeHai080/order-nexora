import { BRAND } from '../../data/siteData';
import { WHY_FEATURES } from '../../data/servicesData';
import { useSmartNav } from '../layout/useSmartNav';

/**
 * Section "Về NexoraTech" — 2 cột: ảnh trái + nội dung phải (giới thiệu + 4 điểm
 * mạnh dạng icon). Style ufotech.vn "Về UFOTECH".
 */
export default function HomeAbout() {
  const nav = useSmartNav();
  return (
    <section className="mp-section" id="about">
      <div className="mp-container">
        <div className="tw-grid tw-items-center tw-gap-10 lg:tw-grid-cols-2">
          {/* Ảnh */}
          <div className="reveal tw-relative">
            <img
              src="https://picsum.photos/seed/nexora-about/720/520"
              alt="Về NexoraTech"
              className="tw-w-full tw-rounded-2xl tw-object-cover tw-shadow-[0_18px_40px_rgba(0,0,0,0.12)]"
            />
            <div className="tw-absolute -tw-bottom-5 -tw-right-3 tw-hidden tw-rounded-2xl tw-bg-gradient-to-br tw-from-gold-light tw-to-gold tw-px-6 tw-py-4 tw-text-black tw-shadow-lg sm:tw-block">
              <p className="tw-text-[26px] tw-font-extrabold tw-leading-none">{2026 - BRAND.since}+</p>
              <p className="tw-text-[12.5px] tw-font-semibold">năm đồng hành</p>
            </div>
          </div>

          {/* Nội dung */}
          <div className="reveal delay-1">
            <span className="mp-eyebrow">Về chúng tôi</span>
            <h2 className="mp-title mp-title--left">
              {BRAND.name} — đối tác tin cậy cho mọi giải pháp số
            </h2>
            <p className="tw-mt-4 tw-text-[14.5px] tw-leading-relaxed tw-text-neutral-600">
              Từ năm {BRAND.since}, {BRAND.name} đồng hành cùng hàng nghìn cá nhân và doanh nghiệp trong việc
              tiếp cận tài khoản AI bản quyền, đăng ký tên miền và thuê VPS/Hosting. Chúng tôi cam kết giao
              hàng tự động, bảo hành rõ ràng và hỗ trợ kỹ thuật tận tâm 24/7.
            </p>

            <div className="tw-mt-6 tw-grid tw-gap-4 sm:tw-grid-cols-2">
              {WHY_FEATURES.map((f) => (
                <div key={f.title} className="tw-flex tw-gap-3">
                  <span className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-bg-gold/12 tw-text-[18px] tw-text-gold-dark">
                    <i className={`bi ${f.icon}`} />
                  </span>
                  <div>
                    <p className="tw-text-[14px] tw-font-bold tw-text-ink">{f.title}</p>
                    <p className="tw-text-[12.5px] tw-leading-snug tw-text-neutral-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => nav('/dich-vu')}
              className="tw-mt-7 tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-full tw-border tw-border-gold/60 tw-px-6 tw-py-3 tw-text-[13.5px] tw-font-bold tw-text-gold-dark tw-transition-all hover:tw-border-gold hover:tw-bg-gold/8"
            >
              Xem tất cả dịch vụ <i className="bi bi-arrow-right" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
