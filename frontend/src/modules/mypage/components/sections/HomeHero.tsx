import { useEffect, useState } from 'react';
import { HERO_SLIDES } from '../../data/siteData';
import { useSmartNav } from '../layout/useSmartNav';

/**
 * Hero slider trang chủ — THEME SÁNG: ảnh nền + overlay trắng gradient (chữ tối
 * đọc rõ), nội dung căn trái. Tự chuyển slide 6s + ken-burns nhẹ.
 */
export default function HomeHero() {
  const nav = useSmartNav();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setActive((i) => (i + 1) % HERO_SLIDES.length), 6000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="mp-hero">
      {HERO_SLIDES.map((s, i) => (
        <div
          key={s.id}
          className={`mp-hero-slide${i === active ? ' active' : ''}`}
          style={{ backgroundImage: `url(${s.image})` }}
          aria-hidden={i !== active}
        />
      ))}

      <div className="tw-relative tw-z-[2] tw-mx-auto tw-flex tw-min-h-[460px] tw-max-w-container tw-items-center tw-px-5 tw-py-16 sm:tw-min-h-[540px]">
        {HERO_SLIDES.map((s, i) =>
          i === active ? (
            <div key={s.id} className="tw-max-w-[620px]">
              <span className="tw-mb-3 tw-inline-block tw-text-[13px] tw-font-bold tw-uppercase tw-tracking-[2px] tw-text-gold-dark">
                {s.eyebrow}
              </span>
              <h1 className="tw-whitespace-pre-line tw-text-[30px] tw-font-extrabold tw-leading-tight tw-text-ink sm:tw-text-[44px]">
                {s.title}
              </h1>
              <p className="tw-mt-4 tw-max-w-[520px] tw-text-[15px] tw-leading-relaxed tw-text-neutral-600 sm:tw-text-[16px]">
                {s.desc}
              </p>
              <div className="tw-mt-7 tw-flex tw-flex-wrap tw-gap-3">
                <button
                  type="button"
                  onClick={() => nav(s.href)}
                  className="tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-full tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-px-7 tw-py-3.5 tw-text-[14px] tw-font-bold tw-uppercase tw-text-black tw-shadow-[0_6px_22px_rgba(201,164,76,0.45)] tw-transition-all hover:-tw-translate-y-1 hover:tw-shadow-[0_10px_30px_rgba(201,164,76,0.6)]"
                >
                  <i className="bi bi-lightning-fill" />{s.cta}
                </button>
                <button
                  type="button"
                  onClick={() => nav('/#about')}
                  className="tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-full tw-border tw-border-ink/20 tw-bg-white/70 tw-px-6 tw-py-3.5 tw-text-[14px] tw-font-bold tw-text-ink tw-backdrop-blur tw-transition-all hover:tw-border-gold hover:tw-text-gold-dark"
                >
                  Tìm hiểu thêm
                </button>
              </div>
            </div>
          ) : null,
        )}
      </div>

      <div className="mp-hero-dots">
        {HERO_SLIDES.map((s, i) => (
          <button key={s.id} className={i === active ? 'active' : ''} aria-label={`Slide ${i + 1}`} onClick={() => setActive(i)} />
        ))}
      </div>
    </section>
  );
}
