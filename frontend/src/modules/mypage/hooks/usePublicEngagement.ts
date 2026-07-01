import { useCallback, useEffect, useState } from 'react';
import {
  fetchComments,
  fetchDiscussions,
  fetchReviews,
  fetchTestimonials,
  type PublicEngagement,
  type RatingSummary,
} from '../api/engagementClient';

/** Đánh giá sản phẩm đã duyệt + tóm tắt sao. `reload` gọi lại sau khi gửi. */
export function usePublicReviews(productId: number | undefined) {
  const [items, setItems] = useState<PublicEngagement[]>([]);
  const [summary, setSummary] = useState<RatingSummary>({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!productId) return;
    setLoading(true);
    fetchReviews(productId, { limit: 50 })
      .then((r) => {
        setItems(r.items);
        setSummary(r.summary);
      })
      .catch(() => {
        setItems([]);
        setSummary({ average: 0, count: 0 });
      })
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, summary, loading, reload };
}

/** Trao đổi theo sản phẩm đã duyệt. */
export function usePublicDiscussions(productId: number | undefined) {
  const [items, setItems] = useState<PublicEngagement[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!productId) return;
    setLoading(true);
    fetchDiscussions(productId, { limit: 50 })
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, loading, reload };
}

/** Bình luận bài viết đã duyệt. */
export function usePublicComments(articleId: number | undefined) {
  const [items, setItems] = useState<PublicEngagement[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!articleId) return;
    setLoading(true);
    fetchComments(articleId, { limit: 50 })
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [articleId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, loading, reload };
}

/** Cảm nhận trang chủ đã duyệt. */
export function usePublicTestimonials(limit = 12) {
  const [items, setItems] = useState<PublicEngagement[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    fetchTestimonials(limit)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [limit]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, loading, reload };
}
