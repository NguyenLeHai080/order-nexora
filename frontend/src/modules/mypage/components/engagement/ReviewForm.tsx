import { useState, type FormEvent } from 'react';
import { useMyPage } from '../MyPageShell';
import { StarInput } from './StarRating';

/**
 * Form gửi đánh giá sản phẩm. Chỉ hiện khi khách đã đăng nhập; backend sẽ chặn
 * nếu chưa mua sản phẩm (trả 403) — ta bắt lỗi và hiển thị thông báo tương ứng.
 */
export default function ReviewForm({
  onSubmit,
}: {
  onSubmit: (body: { rating: number; title?: string; content: string }) => Promise<string>;
}) {
  const { isLoggedIn, openAuth } = useMyPage();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const field =
    'tw-w-full tw-rounded-xl tw-border tw-border-neutral-300 tw-bg-white tw-px-3.5 tw-py-2.5 tw-text-[14px] tw-text-ink tw-outline-none focus:tw-border-gold focus:tw-ring-2 focus:tw-ring-gold/20';

  if (!isLoggedIn) {
    return (
      <div className="tw-rounded-2xl tw-border tw-border-dashed tw-border-neutral-300 tw-bg-neutral-50 tw-p-5 tw-text-center">
        <p className="tw-text-[14px] tw-text-neutral-600">
          Chỉ khách đã mua sản phẩm mới có thể đánh giá.
        </p>
        <button
          type="button"
          onClick={() => openAuth('login')}
          className="tw-mt-3 tw-inline-flex tw-items-center tw-gap-1.5 tw-font-semibold tw-text-gold-dark hover:tw-underline"
        >
          <i className="bi bi-box-arrow-in-right" />Đăng nhập để đánh giá
        </button>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setNotice({ ok: false, text: 'Vui lòng nhập nội dung đánh giá.' });
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      const msg = await onSubmit({ rating, title: title.trim() || undefined, content: content.trim() });
      setNotice({ ok: true, text: msg });
      setContent('');
      setTitle('');
      setRating(5);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
      const text =
        status === 403
          ? 'Bạn cần mua sản phẩm này trước khi đánh giá.'
          : detail?.message || detail?.detail || 'Gửi đánh giá không thành công.';
      setNotice({ ok: false, text });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-neutral-200 tw-bg-white tw-p-5">
      <div className="tw-flex tw-items-center tw-gap-3">
        <span className="tw-text-[14px] tw-font-semibold tw-text-ink">Chấm điểm:</span>
        <StarInput value={rating} onChange={setRating} />
      </div>
      <input
        className={field}
        placeholder="Tiêu đề (không bắt buộc)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={255}
      />
      <textarea
        className={`${field} tw-min-h-[96px] tw-resize-y`}
        placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
      />
      {notice && (
        <p className={`tw-text-[13px] ${notice.ok ? 'tw-text-green-600' : 'tw-text-red-500'}`}>{notice.text}</p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-full tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-px-6 tw-py-2.5 tw-text-[13.5px] tw-font-bold tw-text-black tw-shadow-[0_4px_14px_rgba(201,164,76,0.4)] tw-transition-all hover:-tw-translate-y-px disabled:tw-opacity-50"
      >
        <i className="bi bi-star-fill" />
        {sending ? 'Đang gửi…' : 'Gửi đánh giá'}
      </button>
      <p className="tw-text-[12px] tw-text-neutral-400">Đánh giá sẽ hiển thị sau khi được duyệt.</p>
    </form>
  );
}
