import { BRAND } from '../../data/siteData';
import type { PublicEngagement } from '../../api/engagementClient';
import { StarRating } from './StarRating';

/** Ngày ISO -> 'DD/MM/YYYY'. */
function dmy(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Chữ cái đầu của tên -> avatar tròn. */
function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/**
 * Danh sách tương tác đã duyệt (đánh giá / bình luận / thảo luận / cảm nhận).
 * Nội dung do khách gửi luôn render TEXT THUẦN (không dangerouslySetInnerHTML).
 * Nếu có `admin_reply` thì hiện như phản hồi chính thức từ brand.
 */
export default function EngagementList({
  items,
  emptyText = 'Chưa có nội dung nào. Hãy là người đầu tiên!',
  showRating = false,
}: {
  items: PublicEngagement[];
  emptyText?: string;
  showRating?: boolean;
}) {
  if (items.length === 0) {
    return <p className="tw-py-6 tw-text-center tw-text-[14px] tw-text-neutral-400">{emptyText}</p>;
  }

  return (
    <ul className="tw-space-y-4">
      {items.map((e) => (
        <li
          key={e.id}
          className="tw-rounded-2xl tw-border tw-border-neutral-200 tw-bg-white tw-p-5 tw-shadow-sm"
        >
          <div className="tw-flex tw-items-start tw-gap-3">
            <span className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-gold/15 tw-text-[15px] tw-font-bold tw-text-gold-dark">
              {initial(e.author_name)}
            </span>
            <div className="tw-min-w-0 tw-flex-1">
              <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-x-2 tw-gap-y-0.5">
                <span className="tw-text-[14px] tw-font-bold tw-text-ink">{e.author_name}</span>
                {e.is_verified_purchase && (
                  <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-green-100 tw-px-2 tw-py-[1px] tw-text-[11px] tw-font-semibold tw-text-green-700">
                    <i className="bi bi-patch-check-fill" />Đã mua
                  </span>
                )}
                {e.created_at && (
                  <span className="tw-text-[12px] tw-text-neutral-400">{dmy(e.created_at)}</span>
                )}
              </div>
              {showRating && e.rating != null && (
                <div className="tw-mt-0.5">
                  <StarRating value={e.rating} size={14} />
                </div>
              )}
              {e.title && <p className="tw-mt-1 tw-text-[14px] tw-font-semibold tw-text-ink">{e.title}</p>}
              <p className="tw-mt-1 tw-whitespace-pre-wrap tw-text-[14px] tw-leading-relaxed tw-text-neutral-700">
                {e.content}
              </p>

              {e.admin_reply && (
                <div className="tw-mt-3 tw-rounded-xl tw-border-l-2 tw-border-gold tw-bg-gold/5 tw-p-3">
                  <p className="tw-mb-1 tw-flex tw-items-center tw-gap-1.5 tw-text-[12.5px] tw-font-bold tw-text-gold-dark">
                    <i className="bi bi-reply-fill" />Phản hồi từ {BRAND.name}
                  </p>
                  <p className="tw-whitespace-pre-wrap tw-text-[13.5px] tw-leading-relaxed tw-text-neutral-700">
                    {e.admin_reply}
                  </p>
                </div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
