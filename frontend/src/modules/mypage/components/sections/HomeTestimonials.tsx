import { useState } from 'react';
import { usePublicTestimonials } from '../../hooks/usePublicEngagement';
import { submitTestimonial } from '../../api/engagementClient';
import EngagementList from '../engagement/EngagementList';
import CommentForm from '../engagement/CommentForm';

/**
 * Section "Cảm nhận khách hàng" trang chủ — hiển thị cảm nhận đã duyệt (API) +
 * form gửi cảm nhận (cho phép ẩn danh). Nội dung mới chờ admin duyệt mới hiện.
 */
export default function HomeTestimonials() {
  const { items, loading, reload } = usePublicTestimonials(12);
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="mp-section mp-section--soft">
      <div className="mp-container">
        <div className="mp-head reveal">
          <span className="mp-eyebrow">Cảm nhận</span>
          <h2 className="mp-title">Khách hàng nói gì về NexoraTech</h2>
          <p className="mp-subtitle">Niềm tin của bạn là động lực để chúng tôi hoàn thiện mỗi ngày.</p>
        </div>

        {loading ? (
          <p className="tw-py-10 tw-text-center tw-text-neutral-400">Đang tải cảm nhận…</p>
        ) : (
          <div className="tw-mx-auto tw-max-w-3xl">
            <EngagementList
              items={items}
              showRating
              emptyText="Chưa có cảm nhận nào. Hãy là người đầu tiên chia sẻ trải nghiệm!"
            />
          </div>
        )}

        <div className="tw-mx-auto tw-mt-7 tw-max-w-3xl">
          {showForm ? (
            <div className="tw-rounded-2xl tw-border tw-border-neutral-200 tw-bg-white tw-p-5">
              <h3 className="tw-mb-4 tw-text-[16px] tw-font-bold tw-text-ink">Gửi cảm nhận của bạn</h3>
              <CommentForm
                placeholder="Chia sẻ trải nghiệm của bạn với dịch vụ NexoraTech…"
                submitLabel="Gửi cảm nhận"
                onSubmit={async (body) => {
                  const msg = await submitTestimonial(body);
                  reload();
                  return msg;
                }}
              />
            </div>
          ) : (
            <div className="tw-text-center">
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-full tw-border tw-border-gold/60 tw-px-6 tw-py-2.5 tw-text-[13.5px] tw-font-bold tw-text-gold-dark tw-transition-all hover:tw-border-gold hover:tw-bg-gold/10"
              >
                <i className="bi bi-chat-heart" />Gửi cảm nhận của bạn
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
