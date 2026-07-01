import { TESTIMONIALS } from '../../data/servicesData';
import TestimonialCard from '../cards/TestimonialCard';

/**
 * Section "Cảm nhận khách hàng" trang chủ — grid 3 card (style ufotech.vn).
 */
export default function HomeTestimonials() {
  return (
    <section className="mp-section mp-section--soft">
      <div className="mp-container">
        <div className="mp-head reveal">
          <span className="mp-eyebrow">Cảm nhận</span>
          <h2 className="mp-title">Khách hàng nói gì về NexoraTech</h2>
          <p className="mp-subtitle">Niềm tin của bạn là động lực để chúng tôi hoàn thiện mỗi ngày.</p>
        </div>

        <div className="tw-grid tw-gap-5 md:tw-grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.id} data={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
