import { apiClient } from '../../../core/apiClient';
import { publicClient } from './publicClient';

/**
 * Client cho hệ thống tương tác landing (đánh giá / bình luận / cảm nhận / thảo luận).
 *
 * - ĐỌC: qua `publicClient` (không auth) — chỉ trả nội dung đã duyệt.
 * - GHI: qua `apiClient` để tự đính Bearer khi khách đã đăng nhập (backend gắn
 *   user_id + tên thật). Submit đánh giá BẮT BUỘC đăng nhập; comment/cảm nhận/
 *   thảo luận cho phép ẩn danh (không token vẫn gửi được).
 *
 * Bảo mật: `PublicEngagement` chỉ chứa trường an toàn — KHÔNG có email/user_id/
 * status. Nội dung do khách gửi phải render dạng text thuần trên UI.
 */
export interface PublicEngagement {
  id: number;
  author_name: string;
  rating: number | null;
  title: string | null;
  content: string;
  is_verified_purchase: boolean;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string | null;
}

export interface RatingSummary {
  average: number;
  count: number;
}

interface Paged {
  page?: number;
  limit?: number;
}

function list(res: { data: { data?: PublicEngagement[]; meta?: { total?: number } } }) {
  return { items: res.data.data ?? [], total: res.data.meta?.total ?? 0 };
}

/* ─── Đọc (public) ──────────────────────────────────────────────────────── */

export async function fetchReviews(productId: number, params: Paged = {}) {
  const res = await publicClient.get(`/products/${productId}/reviews`, { params });
  return { ...list(res), summary: (res.data.summary ?? { average: 0, count: 0 }) as RatingSummary };
}

export async function fetchRating(productId: number): Promise<RatingSummary> {
  const res = await publicClient.get(`/products/${productId}/rating`);
  return res.data.data ?? { average: 0, count: 0 };
}

export async function fetchComments(articleId: number, params: Paged = {}) {
  const res = await publicClient.get(`/articles/${articleId}/comments`, { params });
  return list(res);
}

export async function fetchTestimonials(limit = 12): Promise<PublicEngagement[]> {
  const res = await publicClient.get('/testimonials', { params: { limit } });
  return res.data.data ?? [];
}

export async function fetchDiscussions(
  productId: number,
  params: Paged & { article_id?: number } = {},
) {
  const res = await publicClient.get(`/products/${productId}/discussions`, { params });
  return list(res);
}

/* ─── Ghi ───────────────────────────────────────────────────────────────── */

/** Gửi đánh giá sản phẩm (yêu cầu đăng nhập + đã mua). Trả message. */
export async function submitReview(
  productId: number,
  body: { rating: number; title?: string; content: string },
): Promise<string> {
  const res = await apiClient.post(`/public/products/${productId}/reviews`, body);
  return res.data.message ?? 'Đã gửi đánh giá.';
}

/** Gửi bình luận bài viết (cho phép ẩn danh). */
export async function submitComment(
  articleId: number,
  body: { author_name: string; author_email?: string; content: string },
): Promise<string> {
  const res = await apiClient.post(`/public/articles/${articleId}/comments`, body);
  return res.data.message ?? 'Đã gửi bình luận.';
}

/** Gửi cảm nhận trang chủ (cho phép ẩn danh). */
export async function submitTestimonial(body: {
  author_name: string;
  author_email?: string;
  content: string;
  rating?: number;
}): Promise<string> {
  const res = await apiClient.post('/public/testimonials', body);
  return res.data.message ?? 'Đã gửi cảm nhận.';
}

/** Gửi trao đổi theo sản phẩm (cho phép ẩn danh). */
export async function submitDiscussion(
  productId: number,
  body: { author_name: string; author_email?: string; content: string; article_id?: number },
): Promise<string> {
  const res = await apiClient.post(`/public/products/${productId}/discussions`, body);
  return res.data.message ?? 'Đã gửi nội dung.';
}
