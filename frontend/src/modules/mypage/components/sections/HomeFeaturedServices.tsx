import ServiceCard from '../cards/ServiceCard';
import { useSmartNav } from '../layout/useSmartNav';
import { usePublicServices } from '../../hooks/usePublicContent';

/**
 * Section "Dịch vụ nổi bật" trang chủ — grid ServiceCard (lấy 6 dịch vụ đầu).
 * Style ufotech.vn "Dịch vụ nổi bật". Dữ liệu = sản phẩm thật (API public).
 */
export default function HomeFeaturedServices() {
  const nav = useSmartNav();
  const { services } = usePublicServices();
  const featured = services.slice(0, 6);

  return (
    <section className="mp-section mp-section--soft">
      <div className="mp-container">
        <div className="mp-head reveal">
          <span className="mp-eyebrow">Dịch vụ nổi bật</span>
          <h2 className="mp-title">Giải pháp số được tin dùng nhất</h2>
          <p className="mp-subtitle">
            Tài khoản AI, Domain và VPS bản quyền — giao tự động, bảo hành rõ ràng, hỗ trợ 24/7.
          </p>
        </div>

        <div className="tw-grid tw-gap-5 sm:tw-grid-cols-2 lg:tw-grid-cols-3">
          {featured.map((s) => (
            <ServiceCard
              key={s.id}
              data={{
                categoryLabel: s.categoryLabel,
                title: s.title,
                excerpt: s.excerpt,
                date: s.date,
                image: s.image,
                href: s.href,
              }}
            />
          ))}
        </div>

        <div className="tw-mt-9 tw-text-center">
          <button
            type="button"
            onClick={() => nav('/dich-vu')}
            className="tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-full tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-px-8 tw-py-3 tw-text-[14px] tw-font-bold tw-uppercase tw-text-black tw-shadow-[0_4px_16px_rgba(201,164,76,0.4)] tw-transition-all hover:-tw-translate-y-px hover:tw-shadow-[0_7px_24px_rgba(201,164,76,0.55)]"
          >
            Xem tất cả dịch vụ <i className="bi bi-arrow-right" />
          </button>
        </div>
      </div>
    </section>
  );
}
