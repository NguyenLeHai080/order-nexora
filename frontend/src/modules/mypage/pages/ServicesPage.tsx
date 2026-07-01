import { useRef, useState } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import MyPageShell from '../components/MyPageShell';
import PageHeader from '../components/layout/PageHeader';
import CategoryTile from '../components/cards/CategoryTile';
import ServiceCard from '../components/cards/ServiceCard';
import CategoryTabs from '../components/common/CategoryTabs';
import { usePublicServices } from '../hooks/usePublicContent';

/**
 * Trang Dịch vụ (route `/dich-vu`) — dựng theo ufotech.vn /dich-vu:
 * breadcrumb + page header → slider danh mục ảnh lớn → tab lọc → grid ServiceCard.
 * "Dịch vụ" = sản phẩm thật (API public); CTA "Xem thêm" mở chi tiết sản phẩm.
 */
export default function ServicesPage() {
  const [cat, setCat] = useState('all');
  const { services, categories, loading } = usePublicServices();
  useScrollReveal([cat, loading]);

  const railRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { key: 'all', label: 'Tất cả', count: services.length },
    ...categories.map((c) => ({
      key: c.key,
      label: c.label,
      count: services.filter((s) => s.categoryKey === c.key).length,
    })),
  ];

  const list = cat === 'all' ? services : services.filter((s) => s.categoryKey === cat);

  /** Bấm danh mục → lọc danh sách + cuộn xuống khu vực danh sách. */
  const pickCategory = (key: string) => {
    setCat(key);
    window.setTimeout(
      () => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      60,
    );
  };

  /** Cuộn slider danh mục theo chiều ngang (≈80% bề rộng khung nhìn). */
  const slide = (dir: -1 | 1) => {
    const el = railRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <MyPageShell>
      <PageHeader
        title="Dịch vụ số NexoraTech"
        intro="Tài khoản AI bản quyền, đăng ký tên miền, VPS/Hosting hiệu năng cao — giao tự động, bảo hành rõ ràng và hỗ trợ kỹ thuật 24/7."
        breadcrumb={[{ label: 'Dịch vụ' }]}
      />

      {/* Danh mục lớn — slider ngang */}
      {categories.length > 0 && (
        <section className="mp-section">
          <div className="mp-container">
            <div className="tw-mb-5 tw-flex tw-items-end tw-justify-between tw-gap-4">
              <div>
                <h2 className="mp-title tw-text-left">Danh mục dịch vụ</h2>
                <p className="mp-subtitle tw-text-left">Chọn nhóm dịch vụ bạn quan tâm.</p>
              </div>
              <div className="tw-hidden tw-shrink-0 tw-gap-2 sm:tw-flex">
                <button
                  type="button"
                  aria-label="Xem danh mục trước"
                  onClick={() => slide(-1)}
                  className="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-neutral-300 tw-bg-white tw-text-neutral-600 tw-transition-colors hover:tw-border-gold hover:tw-text-gold-dark"
                >
                  <i className="bi bi-chevron-left" />
                </button>
                <button
                  type="button"
                  aria-label="Xem danh mục tiếp theo"
                  onClick={() => slide(1)}
                  className="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-neutral-300 tw-bg-white tw-text-neutral-600 tw-transition-colors hover:tw-border-gold hover:tw-text-gold-dark"
                >
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
            </div>

            <div
              ref={railRef}
              className="mp-rail tw-flex tw-snap-x tw-snap-mandatory tw-gap-4 tw-overflow-x-auto tw-pb-2"
            >
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="tw-w-[68%] tw-shrink-0 tw-snap-start sm:tw-w-[40%] lg:tw-w-[23.5%]"
                >
                  <CategoryTile
                    data={{ label: c.label, image: c.image }}
                    active={cat === c.key}
                    onClick={() => pickCategory(c.key)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Danh sách dịch vụ */}
      <section ref={listRef} className="mp-section mp-section--soft" style={{ paddingTop: 0 }}>
        <div className="mp-container tw-pt-12">
          <div className="mp-head">
            <h2 className="mp-title">Tất cả dịch vụ</h2>
            <p className="mp-subtitle">Chọn nhóm dịch vụ phù hợp với nhu cầu của bạn.</p>
          </div>

          <div className="tw-mb-7">
            <CategoryTabs items={tabs} active={cat} onChange={pickCategory} />
          </div>

          {loading ? (
            <p className="tw-py-10 tw-text-center tw-text-neutral-400">Đang tải dịch vụ…</p>
          ) : list.length === 0 ? (
            <p className="tw-py-10 tw-text-center tw-text-neutral-400">Chưa có dịch vụ trong nhóm này.</p>
          ) : (
            <div className="tw-grid tw-gap-5 sm:tw-grid-cols-2 lg:tw-grid-cols-3">
              {list.map((s) => (
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
          )}
        </div>
      </section>
    </MyPageShell>
  );
}
