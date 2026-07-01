import { useScrollReveal } from '../hooks/useScrollReveal';
import MyPageShell from '../components/MyPageShell';
import PageHeader from '../components/layout/PageHeader';
import Accordion from '../components/common/Accordion';
import { usePublicFaqs } from '../hooks/usePublicContent';
import { BRAND } from '../data/siteData';

/** Trang FAQ (route `/faq`) — PageHeader + Accordion 1 cột + box liên hệ hỗ trợ. */
export default function FaqPage() {
  const { faqs, loading } = usePublicFaqs();
  useScrollReveal([loading]);
  return (
    <MyPageShell>
      <PageHeader
        title="Hỏi đáp chuyên gia (FAQ)"
        intro="Những câu hỏi thường gặp về dịch vụ, thanh toán, bảo hành và hỗ trợ tại NexoraTech."
        breadcrumb={[{ label: 'FAQ' }]}
      />

      <section className="mp-section">
        <div className="mp-container tw-max-w-[860px]">
          {loading ? (
            <p className="tw-py-10 tw-text-center tw-text-neutral-400">Đang tải câu hỏi…</p>
          ) : (
            <Accordion items={faqs} />
          )}

          <div className="reveal tw-mt-10 tw-rounded-2xl tw-border tw-border-gold/30 tw-bg-gold/5 tw-px-6 tw-py-8 tw-text-center">
            <h3 className="tw-text-lg tw-font-bold tw-text-ink">Chưa tìm thấy câu trả lời?</h3>
            <p className="tw-mx-auto tw-mt-2 tw-max-w-[520px] tw-text-[14px] tw-text-neutral-600">
              Đội ngũ NexoraTech hỗ trợ trực tuyến 24/7. Liên hệ ngay để được giải đáp nhanh nhất.
            </p>
            <div className="tw-mt-5 tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-3">
              <a
                href={`tel:${BRAND.phone.replace(/\s/g, '')}`}
                className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-full tw-bg-gold tw-px-6 tw-py-2.5 tw-text-[14px] tw-font-bold tw-text-black tw-transition hover:tw-bg-gold-dark"
              >
                <i className="bi bi-telephone-fill" /> {BRAND.phone}
              </a>
              <a
                href={BRAND.zalo}
                target="_blank"
                rel="noreferrer"
                className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-full tw-border tw-border-neutral-300 tw-bg-white tw-px-6 tw-py-2.5 tw-text-[14px] tw-font-bold tw-text-ink tw-transition hover:tw-border-gold hover:tw-text-gold-dark"
              >
                <i className="bi bi-chat-dots-fill" /> Chat Zalo
              </a>
            </div>
          </div>
        </div>
      </section>
    </MyPageShell>
  );
}
