import axios from 'axios';

/**
 * Client gọi API public của landing (KHÔNG auth).
 *
 * Tách hẳn khỏi `core/apiClient` vì client đó tự gắn Bearer token +
 * X-Organization-Id và tự logout khi gặp 401 — không phù hợp cho người dùng ẩn
 * danh đang xem landing. Client này không gắn header xác thực nào.
 */
export const publicClient = axios.create({
  baseURL: '/api/public',
  headers: { Accept: 'application/json' },
});

export interface PublicProduct {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  name_en: string | null;
  category_id: number | null;
  category_name: string | null;
  image_url: string | null;
  price: string; // giá khách trả (sale_price)
  regular_price: string | null; // giá niêm yết để gạch ngang nếu > price
  delivery_type: string | null;
  warranty_days: number;
  stock_status: string;
  sold_count: number;
  created_at?: string | null; // ngày tạo (hiển thị trên card dịch vụ)
  rating?: { average: number; count: number }; // chỉ có ở endpoint chi tiết
}

export interface PublicCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  product_count: number;
}

export interface PublicListParams {
  search?: string;
  category_id?: number;
  sort?: 'popular' | 'newest';
  limit?: number;
  page?: number;
}

/** Bài viết public (snake_case từ API). `content` chỉ có ở endpoint chi tiết. */
export interface PublicArticle {
  id: number;
  title: string;
  slug: string;
  category: string;
  category_key: string;
  group: string;
  author: string | null;
  excerpt: string | null;
  image_url: string | null;
  published_at: string | null;
  content: string | null;
  /** Bài liên quan — chỉ có ở endpoint chi tiết. */
  related?: PublicArticle[];
}

export interface PublicFaq {
  id: number;
  question: string;
  answer: string;
}

export interface PublicArticleParams {
  group?: 'tips' | 'news' | 'policy';
  category_key?: string;
  limit?: number;
  page?: number;
}

export async function fetchPublicProducts(
  params: PublicListParams = {},
): Promise<{ items: PublicProduct[]; total: number }> {
  const res = await publicClient.get('/products', { params });
  return { items: res.data.data ?? [], total: res.data.meta?.total ?? 0 };
}

export async function fetchPublicProduct(slug: string): Promise<PublicProduct> {
  const res = await publicClient.get(`/products/${slug}`);
  return res.data.data;
}

export async function fetchPublicCategories(): Promise<PublicCategory[]> {
  const res = await publicClient.get('/categories');
  return res.data.data ?? [];
}

export async function fetchPublicArticles(
  params: PublicArticleParams = {},
): Promise<{ items: PublicArticle[]; total: number }> {
  const res = await publicClient.get('/articles', { params });
  return { items: res.data.data ?? [], total: res.data.meta?.total ?? 0 };
}

export async function fetchPublicArticle(slug: string): Promise<PublicArticle> {
  const res = await publicClient.get(`/articles/${slug}`);
  return res.data.data;
}

export async function fetchPublicFaqs(): Promise<PublicFaq[]> {
  const res = await publicClient.get('/faqs');
  return res.data.data ?? [];
}
