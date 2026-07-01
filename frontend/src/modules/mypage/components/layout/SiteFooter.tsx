import { BRAND, FOOTER_LINKS } from '../../data/siteData';
import NexoraLogo from '../NexoraLogo';
import { useSmartNav } from './useSmartNav';

/** Một cột link trong footer. */
function FootCol({ title, links, onNav }: { title: string; links: { label: string; href: string }[]; onNav: (href: string) => void }) {
  return (
    <div>
      <h3 className="tw-relative tw-mb-4 tw-pb-2.5 tw-text-[15px] tw-font-bold tw-text-white after:tw-absolute after:tw-bottom-0 after:tw-left-0 after:tw-h-0.5 after:tw-w-9 after:tw-bg-gold">
        {title}
      </h3>
      <ul className="tw-flex tw-flex-col tw-gap-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <button
              type="button"
              onClick={() => onNav(l.href)}
              className="tw-cursor-pointer tw-text-left tw-text-[13.5px] tw-text-neutral-400 tw-transition-colors hover:tw-text-gold-light"
            >
              {l.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Badge hình thức thanh toán (text đơn giản). */
const PAYMENTS = ['VISA', 'Mastercard', 'VietQR', 'Momo', 'COD'];

/**
 * Footer public (NỀN TỐI, style ufotech.vn): logo-light + slogan + social,
 * 3 cột sitemap, dải payment badges + copyright. Đọc dữ liệu từ siteData.
 */
export default function SiteFooter() {
  const nav = useSmartNav();
  return (
    <footer className="tw-bg-[#111317] tw-text-neutral-300" id="contact">
      <div className="tw-mx-auto tw-max-w-container tw-px-5 tw-py-14">
        <div className="tw-grid tw-gap-10 md:tw-grid-cols-2 lg:tw-grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Cột thương hiệu */}
          <div>
            <NexoraLogo size={34} tagline />
            <p className="tw-mt-4 tw-max-w-[300px] tw-text-[13.5px] tw-leading-relaxed tw-text-neutral-400">
              Cửa hàng tài khoản AI · Domain · VPS bản quyền — giao tự động, bảo hành rõ ràng. {BRAND.slogan}.
            </p>
            <div className="tw-mt-5 tw-flex tw-flex-col tw-gap-2 tw-text-[13.5px] tw-text-neutral-400">
              <span className="tw-flex tw-items-start tw-gap-2">
                <i className="bi bi-geo-alt-fill tw-mt-0.5 tw-text-gold" />{BRAND.address}
              </span>
              <span className="tw-flex tw-items-center tw-gap-2">
                <i className="bi bi-telephone-fill tw-text-gold" />Hotline: <b className="tw-text-white">{BRAND.phone}</b>
              </span>
              <span className="tw-flex tw-items-center tw-gap-2">
                <i className="bi bi-clock-fill tw-text-gold" />{BRAND.hours}
              </span>
            </div>
            <div className="tw-mt-5 tw-flex tw-gap-2.5">
              <a href={BRAND.zalo} target="_blank" rel="noreferrer" className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-full tw-bg-[#0068ff] tw-text-[12px] tw-font-extrabold tw-text-white" aria-label="Zalo">Z</a>
              <a href={`tel:${BRAND.phone.replace(/[^0-9+]/g, '')}`} className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-full tw-bg-[#e0322f] tw-text-white" aria-label="Gọi điện"><i className="bi bi-telephone-fill tw-text-[15px]" /></a>
              <a href={BRAND.facebook} target="_blank" rel="noreferrer" className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-full tw-bg-[#1877f2] tw-text-white" aria-label="Facebook"><i className="bi bi-facebook tw-text-[15px]" /></a>
              <a href={`mailto:${BRAND.email}`} className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-full tw-bg-neutral-600 tw-text-white" aria-label="Email"><i className="bi bi-envelope-fill tw-text-[14px]" /></a>
            </div>
          </div>

          <FootCol title="Dịch vụ" links={FOOTER_LINKS.services} onNav={nav} />
          <FootCol title="Nội dung" links={FOOTER_LINKS.content} onNav={nav} />
          <FootCol title="Hỗ trợ" links={FOOTER_LINKS.support} onNav={nav} />
        </div>
      </div>

      {/* Dải dưới: payment + copyright */}
      <div className="tw-border-t tw-border-white/10">
        <div className="tw-mx-auto tw-flex tw-max-w-container tw-flex-col tw-items-center tw-justify-between tw-gap-4 tw-px-5 tw-py-5 sm:tw-flex-row">
          <p className="tw-text-[12.5px] tw-text-neutral-500">
            © {BRAND.since}–2026 {BRAND.company}. Đã đăng ký bản quyền.
          </p>
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
            {PAYMENTS.map((p) => (
              <span key={p} className="tw-rounded tw-border tw-border-white/10 tw-bg-white/5 tw-px-2.5 tw-py-1 tw-text-[11px] tw-font-bold tw-tracking-wide tw-text-neutral-300">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
