import { useState, type FormEvent } from 'react';
import { useMyPage } from '../MyPageShell';

/**
 * Form gửi bình luận / thảo luận (cho phép ẩn danh). Nếu khách đã đăng nhập thì
 * ẩn ô tên/email (backend tự lấy từ tài khoản). Nội dung gửi đi được backend đặt
 * trạng thái `pending` → chờ admin duyệt.
 */
export default function CommentForm({
  onSubmit,
  placeholder = 'Nội dung của bạn…',
  submitLabel = 'Gửi',
}: {
  onSubmit: (body: { author_name: string; author_email?: string; content: string }) => Promise<string>;
  placeholder?: string;
  submitLabel?: string;
}) {
  const { isLoggedIn } = useMyPage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    if (!isLoggedIn && !name.trim()) {
      setNotice({ ok: false, text: 'Vui lòng nhập tên của bạn.' });
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      const msg = await onSubmit({
        author_name: name.trim() || 'Khách',
        author_email: email.trim() || undefined,
        content: content.trim(),
      });
      setNotice({ ok: true, text: msg });
      setContent('');
      setName('');
      setEmail('');
    } catch {
      setNotice({ ok: false, text: 'Gửi không thành công. Vui lòng thử lại.' });
    } finally {
      setSending(false);
    }
  }

  const field =
    'tw-w-full tw-rounded-xl tw-border tw-border-neutral-300 tw-bg-white tw-px-3.5 tw-py-2.5 tw-text-[14px] tw-text-ink tw-outline-none focus:tw-border-gold focus:tw-ring-2 focus:tw-ring-gold/20';

  return (
    <form onSubmit={handleSubmit} className="tw-space-y-3">
      {!isLoggedIn && (
        <div className="tw-grid tw-gap-3 sm:tw-grid-cols-2">
          <input
            className={field}
            placeholder="Tên của bạn *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
          <input
            className={field}
            type="email"
            placeholder="Email (không bắt buộc)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
          />
        </div>
      )}
      <textarea
        className={`${field} tw-min-h-[96px] tw-resize-y`}
        placeholder={placeholder}
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
        <i className="bi bi-send" />
        {sending ? 'Đang gửi…' : submitLabel}
      </button>
      <p className="tw-text-[12px] tw-text-neutral-400">Nội dung sẽ hiển thị sau khi được duyệt.</p>
    </form>
  );
}
