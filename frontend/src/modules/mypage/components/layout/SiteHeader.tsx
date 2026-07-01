import { useEffect, useState } from 'react';
import { BRAND, NAV_ITEMS, type NavItem } from '../../data/siteData';
import NexoraLogo from '../NexoraLogo';
import { useSmartNav } from './useSmartNav';
import { useAuthStore, isStaffRoles } from '../../../../core/authStore';

interface Props {
  cartCount?: number;
  onCartClick?: () => void;
  onLoginClick?: () => void;
  userName?: string | null;
  onLogout?: () => void;
}

/**
 * Header public (THEME SÁNG, style ufotech.vn):
 * - Top utility bar: địa chỉ · hotline · giờ làm việc (nền xám nhạt).
 * - Hàng chính: logo (dark) · nav ngang có mega-menu/dropdown · giỏ + đăng nhập.
 * - Mobile: drawer trượt phải.
 * Nav dùng useSmartNav (route + hash, không reload). preflight Tailwind TẮT.
 */
export default function SiteHeader({
  cartCount = 0,
  onCartClick,
  onLoginClick,
  userName,
  onLogout,
}: Props) {
  const nav = useSmartNav();
  const roles = useAuthStore((s) => s.roles);
  const isStaff = isStaffRoles(roles);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null); // mobile expand

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const go = (href: string) => { setMobileOpen(false); nav(href); };

  return (
    <header className="tw-sticky tw-top-0 tw-z-50 tw-bg-white tw-shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_18px_rgba(0,0,0,0.05)]">
      {/* ── Top utility bar ─────────────────────────────── */}
      <div className="tw-hidden tw-border-b tw-border-neutral-100 tw-bg-[#f7f8fa] md:tw-block">
        <div className="tw-mx-auto tw-flex tw-max-w-container tw-items-center tw-justify-between tw-gap-4 tw-px-5 tw-py-1.5 tw-text-[12.5px] tw-text-neutral-500">
          <span className="tw-flex tw-items-center tw-gap-1.5">
            <i className="bi bi-geo-alt-fill tw-text-gold-dark" />
            {BRAND.address}
          </span>
          <div className="tw-flex tw-items-center tw-gap-5">
            <a href={`tel:${BRAND.phone.replace(/[^0-9+]/g, '')}`} className="tw-flex tw-items-center tw-gap-1.5 hover:tw-text-gold-dark">
              <i className="bi bi-telephone-fill tw-text-gold-dark" />
              Hotline: <b className="tw-text-ink">{BRAND.phone}</b>
            </a>
            <span className="tw-flex tw-items-center tw-gap-1.5">
              <i className="bi bi-clock-fill tw-text-gold-dark" />
              {BRAND.hours}
            </span>
          </div>
        </div>
      </div>

      {/* ── Hàng chính ──────────────────────────────────── */}
      <div className="tw-mx-auto tw-flex tw-max-w-container tw-items-center tw-justify-between tw-gap-4 tw-px-4 tw-py-3 sm:tw-px-5">
        <button type="button" onClick={() => go('/')} className="tw-shrink-0 tw-cursor-pointer focus-visible:tw-outline-none">
          <NexoraLogo size={34} tagline dark />
        </button>

        {/* Nav desktop ≥1025px */}
        <nav className="tw-hidden tw-items-center min-[1025px]:tw-flex">
          <ul className="tw-flex tw-items-center">
            {NAV_ITEMS.map((item) => (
              <NavTopItem key={item.label} item={item} onNavigate={nav} />
            ))}
          </ul>
        </nav>

        {/* Phải: giỏ + auth + burger */}
        <div className="tw-flex tw-items-center tw-gap-2.5 sm:tw-gap-3">
          <button
            type="button"
            onClick={onCartClick}
            className="tw-relative tw-flex tw-h-[38px] tw-w-[38px] tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-neutral-200 tw-text-[18px] tw-text-ink tw-transition-all hover:tw-border-gold hover:tw-text-gold-dark"
            aria-label="Giỏ hàng"
          >
            <i className="bi bi-cart3" />
            {cartCount > 0 && (
              <span className="tw-absolute -tw-right-1 -tw-top-1 tw-flex tw-h-[18px] tw-min-w-[18px] tw-items-center tw-justify-center tw-rounded-full tw-bg-gold tw-px-1 tw-text-[10px] tw-font-bold tw-text-black">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          {userName ? (
            <div className="tw-relative">
              <button
                type="button"
                onClick={() => setAcctOpen((v) => !v)}
                className="tw-flex tw-items-center tw-gap-2 tw-rounded-full tw-border tw-border-neutral-200 tw-py-1 tw-pl-1 tw-pr-3 tw-transition-all hover:tw-border-gold"
              >
                <span className="tw-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-rounded-full tw-bg-gradient-to-br tw-from-gold-light tw-to-gold tw-text-[12px] tw-font-bold tw-text-black">
                  {userName.charAt(0).toUpperCase()}
                </span>
                <span className="tw-hidden tw-max-w-[110px] tw-truncate tw-text-[13px] tw-font-semibold tw-text-ink sm:tw-block">{userName}</span>
                <i className="bi bi-chevron-down tw-text-[9px] tw-text-neutral-400" />
              </button>
              {acctOpen && (
                <div
                  className="tw-absolute tw-right-0 tw-top-full tw-z-[60] tw-mt-2 tw-min-w-[190px] tw-overflow-hidden tw-rounded-xl tw-border tw-border-neutral-200 tw-bg-white tw-py-1.5 tw-shadow-[0_14px_40px_rgba(0,0,0,0.14)]"
                  onMouseLeave={() => setAcctOpen(false)}
                >
                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => { setAcctOpen(false); go('/admin'); }}
                      className="tw-flex tw-w-full tw-items-center tw-gap-2 tw-px-4 tw-py-2.5 tw-text-left tw-text-[13.5px] tw-text-ink tw-transition-colors hover:tw-bg-[#f5f6f8] hover:tw-text-gold-dark"
                    >
                      <i className="bi bi-speedometer2 tw-w-4 tw-text-gold-dark" />Trang quản lý
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setAcctOpen(false); go('/tai-khoan'); }}
                    className="tw-flex tw-w-full tw-items-center tw-gap-2 tw-px-4 tw-py-2.5 tw-text-left tw-text-[13.5px] tw-text-ink tw-transition-colors hover:tw-bg-[#f5f6f8] hover:tw-text-gold-dark"
                  >
                    <i className="bi bi-person-gear tw-w-4 tw-text-gold-dark" />Tài khoản của tôi
                  </button>
                  <div className="tw-mx-3 tw-my-1 tw-border-t tw-border-neutral-100" />
                  <button
                    type="button"
                    onClick={() => { setAcctOpen(false); onLogout?.(); }}
                    className="tw-flex tw-w-full tw-items-center tw-gap-2 tw-px-4 tw-py-2.5 tw-text-left tw-text-[13.5px] tw-text-red-600 tw-transition-colors hover:tw-bg-red-50"
                  >
                    <i className="bi bi-box-arrow-right tw-w-4" />Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onLoginClick}
              className="tw-hidden tw-items-center tw-gap-1.5 tw-whitespace-nowrap tw-rounded-full tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-px-5 tw-py-2 tw-text-[13px] tw-font-bold tw-uppercase tw-text-black tw-shadow-[0_4px_14px_rgba(201,164,76,0.35)] tw-transition-all hover:-tw-translate-y-px hover:tw-shadow-[0_6px_20px_rgba(201,164,76,0.5)] sm:tw-inline-flex"
            >
              <i className="bi bi-person-circle tw-text-[15px]" />
              Đăng nhập
            </button>
          )}

          <button
            type="button"
            className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-neutral-200 tw-text-[20px] tw-text-ink min-[1025px]:tw-hidden"
            aria-label="Mở menu"
            onClick={() => setMobileOpen(true)}
          >
            <i className="bi bi-list" />
          </button>
        </div>
      </div>

      {/* ── Drawer mobile ───────────────────────────────── */}
      <div
        className={`tw-fixed tw-inset-0 tw-z-[100] tw-transition-opacity min-[1025px]:tw-hidden ${
          mobileOpen ? 'tw-visible tw-opacity-100' : 'tw-invisible tw-opacity-0'
        }`}
        onClick={() => setMobileOpen(false)}
      >
        <div className="tw-absolute tw-inset-0 tw-bg-black/40 tw-backdrop-blur-sm" />
        <div
          className={`tw-absolute tw-right-0 tw-top-0 tw-h-full tw-w-[310px] tw-max-w-[86%] tw-overflow-y-auto tw-bg-white tw-shadow-2xl tw-transition-transform ${
            mobileOpen ? 'tw-translate-x-0' : 'tw-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-neutral-100 tw-px-5 tw-py-4">
            <NexoraLogo size={28} dark />
            <button
              type="button"
              className="tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-full tw-text-neutral-500 hover:tw-bg-neutral-100"
              aria-label="Đóng"
              onClick={() => setMobileOpen(false)}
            >
              <i className="bi bi-x-lg tw-text-[16px]" />
            </button>
          </div>

          <nav className="tw-flex tw-flex-col tw-px-3 tw-py-3">
            {NAV_ITEMS.map((item) => {
              const sub = item.groups
                ? item.groups.flatMap((g) => g.items)
                : item.children ?? [];
              const hasSub = sub.length > 0;
              const expanded = openGroup === item.label;
              return (
                <div key={item.label} className="tw-border-b tw-border-neutral-50">
                  <div className="tw-flex tw-items-center">
                    <button
                      type="button"
                      onClick={() => go(item.href)}
                      className="tw-flex tw-flex-1 tw-cursor-pointer tw-items-center tw-gap-2 tw-px-3 tw-py-3 tw-text-left tw-text-[14.5px] tw-font-semibold tw-text-ink hover:tw-text-gold-dark"
                    >
                      {item.label}
                    </button>
                    {hasSub && (
                      <button
                        type="button"
                        onClick={() => setOpenGroup(expanded ? null : item.label)}
                        className="tw-px-3 tw-py-3 tw-text-neutral-400"
                        aria-label="Mở rộng"
                      >
                        <i className={`bi bi-chevron-down tw-text-[12px] tw-transition-transform ${expanded ? 'tw-rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                  {hasSub && expanded && (
                    <div className="tw-flex tw-flex-col tw-pb-2">
                      {sub.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={() => go(c.href)}
                          className="tw-flex tw-items-center tw-gap-2 tw-px-6 tw-py-2 tw-text-left tw-text-[13.5px] tw-text-neutral-600 hover:tw-text-gold-dark"
                        >
                          <i className="bi bi-dot tw-text-gold" />{c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="tw-border-t tw-border-neutral-100 tw-px-4 tw-py-4">
            {userName ? (
              <div className="tw-flex tw-flex-col tw-gap-2">
                <p className="tw-mb-1 tw-text-[12px] tw-text-neutral-500">Xin chào, {userName}</p>
                {isStaff && (
                  <button
                    type="button"
                    onClick={() => go('/admin')}
                    className="tw-flex tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-neutral-200 tw-px-4 tw-py-2.5 tw-text-[13.5px] tw-text-ink hover:tw-border-gold hover:tw-text-gold-dark"
                  >
                    <i className="bi bi-speedometer2 tw-text-gold-dark" />Trang quản lý
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => go('/tai-khoan')}
                  className="tw-flex tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-neutral-200 tw-px-4 tw-py-2.5 tw-text-[13.5px] tw-text-ink hover:tw-border-gold hover:tw-text-gold-dark"
                >
                  <i className="bi bi-person-gear tw-text-gold-dark" />Tài khoản của tôi
                </button>
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); onLogout?.(); }}
                  className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-rounded-lg tw-border tw-border-red-200 tw-px-4 tw-py-2.5 tw-text-[13.5px] tw-font-semibold tw-text-red-600 hover:tw-bg-red-50"
                >
                  <i className="bi bi-box-arrow-right" />Đăng xuất
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setMobileOpen(false); onLoginClick?.(); }}
                className="tw-flex tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-full tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-px-4 tw-py-3 tw-text-[14px] tw-font-bold tw-uppercase tw-text-black tw-shadow-[0_4px_14px_rgba(201,164,76,0.3)]"
              >
                <i className="bi bi-person-circle tw-text-[16px]" />Đăng nhập / Đăng ký
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─── Một mục nav cấp 1 (desktop) — hover hiện dropdown/mega-menu ─────────── */
function NavTopItem({ item, onNavigate }: { item: NavItem; onNavigate: (href: string) => void }) {
  const hasMega = !!item.groups?.length;
  const hasDropdown = !!item.children?.length;

  return (
    <li className="tw-group tw-relative">
      <button
        type="button"
        onClick={() => onNavigate(item.href)}
        className="tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-1.5 tw-whitespace-nowrap tw-px-3.5 tw-py-[18px] tw-text-[14px] tw-font-semibold tw-text-ink tw-transition-colors hover:tw-text-gold-dark lg:tw-px-4"
      >
        {item.label}
        {(hasMega || hasDropdown) && <i className="bi bi-chevron-down tw-text-[9px] tw-opacity-60" />}
      </button>

      {/* Mega-menu (Dịch vụ) */}
      {hasMega && (
        <div className="tw-invisible tw-absolute tw-left-1/2 tw-top-full tw-z-[60] tw-w-[640px] -tw-translate-x-1/2 tw-translate-y-2 tw-rounded-2xl tw-border tw-border-neutral-200 tw-bg-white tw-p-5 tw-opacity-0 tw-shadow-[0_18px_50px_rgba(0,0,0,0.16)] tw-transition-all tw-duration-200 group-hover:tw-visible group-hover:tw-translate-y-0 group-hover:tw-opacity-100">
          <div className="tw-grid tw-grid-cols-3 tw-gap-5">
            {item.groups!.map((g) => (
              <div key={g.heading}>
                <p className="tw-mb-2 tw-border-b tw-border-neutral-100 tw-pb-1.5 tw-text-[12px] tw-font-bold tw-uppercase tw-tracking-wide tw-text-gold-dark">
                  {g.heading}
                </p>
                <ul className="tw-flex tw-flex-col tw-gap-1">
                  {g.items.map((c) => (
                    <li key={c.label}>
                      <button
                        type="button"
                        onClick={() => onNavigate(c.href)}
                        className="tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-gap-2.5 tw-rounded-lg tw-px-2 tw-py-1.5 tw-text-left tw-text-[13px] tw-text-neutral-700 tw-transition-colors hover:tw-bg-[#f5f6f8] hover:tw-text-gold-dark"
                      >
                        {c.image && (
                          <img src={c.image} alt="" className="tw-h-9 tw-w-12 tw-shrink-0 tw-rounded tw-object-cover" />
                        )}
                        <span className="tw-font-medium">{c.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dropdown đơn giản */}
      {hasDropdown && (
        <ul className="tw-invisible tw-absolute tw-left-0 tw-top-full tw-z-[60] tw-min-w-[220px] tw-translate-y-2 tw-overflow-hidden tw-rounded-xl tw-border tw-border-neutral-200 tw-bg-white tw-py-1.5 tw-opacity-0 tw-shadow-[0_14px_40px_rgba(0,0,0,0.14)] tw-transition-all tw-duration-200 group-hover:tw-visible group-hover:tw-translate-y-0 group-hover:tw-opacity-100">
          {item.children!.map((c) => (
            <li key={c.label}>
              <button
                type="button"
                onClick={() => onNavigate(c.href)}
                className="tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-gap-2 tw-px-4 tw-py-2.5 tw-text-left tw-text-[13.5px] tw-text-neutral-700 tw-transition-colors hover:tw-bg-[#f5f6f8] hover:tw-text-gold-dark"
              >
                <i className="bi bi-arrow-right-short tw-text-gold-dark" />{c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
