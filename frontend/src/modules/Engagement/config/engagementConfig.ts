/** Cấu hình module Engagement: endpoint + nhãn loại/trạng thái. */

export const ENGAGEMENTS_ENDPOINT = '/engagements';

/** Các loại tương tác (tab). */
export const ENGAGEMENT_KINDS = [
  { value: 'review', label: 'Đánh giá sản phẩm' },
  { value: 'testimonial', label: 'Cảm nhận' },
  { value: 'comment', label: 'Bình luận bài viết' },
  { value: 'discussion', label: 'Trao đổi sản phẩm' },
];

export const ENGAGEMENT_KIND_LABELS: Record<string, string> = {
  review: 'Đánh giá',
  testimonial: 'Cảm nhận',
  comment: 'Bình luận',
  discussion: 'Trao đổi',
};

export const ENGAGEMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
];
