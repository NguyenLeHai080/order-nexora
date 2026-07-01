import { useEffect, useState } from 'react';
import { BRAND } from '../../data/siteData';

/**
 * Nút nổi liên hệ (Zalo / điện thoại / Facebook) — góc dưới trái.
 * Style scoped trong mypage.css (.mp-float*).
 */
export default function SiteFloats() {
  return (
    <div className="mp-floats">
      <a className="mp-float zalo" href={BRAND.zalo} target="_blank" rel="noreferrer" aria-label="Chat Zalo">Z</a>
      <a className="mp-float fb" href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Chat Facebook">
        <i className="bi bi-facebook" />
      </a>
      <a className="mp-float phone mp-float-pulse" href={`tel:${BRAND.floatPhone}`} aria-label="Gọi điện">
        <i className="bi bi-telephone-fill" />
        <span>Gọi ngay</span>
      </a>
    </div>
  );
}

/** Nút cuộn lên đầu trang — hiện khi cuộn quá 400px. */
export function SiteBackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      type="button"
      className={`mp-totop ${show ? 'show' : ''}`}
      aria-label="Lên đầu trang"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <i className="bi bi-arrow-up" />
    </button>
  );
}
