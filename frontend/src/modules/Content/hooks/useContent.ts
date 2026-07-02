import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { ARTICLES_ENDPOINT, FAQS_ENDPOINT } from '../config/contentConfig';

export interface Article {
  id: number;
  title: string;
  slug: string;
  category: string;
  category_key: string;
  group: string;
  author: string | null;
  excerpt: string | null;
  image_url: string | null;
  content: string | null;
  published_at: string | null;
  sort_order: number;
  status: string;
  show_on_landing: boolean;
  organization_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  status: string;
  show_on_landing: boolean;
  organization_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Danh sách + phân trang bài viết. */
export function useArticles() {
  return useList<Article>(ARTICLES_ENDPOINT);
}

/** Danh sách + phân trang FAQ. */
export function useFaqs() {
  return useList<Faq>(FAQS_ENDPOINT);
}

/** Thao tác ghi bài viết. */
export const articleActions = {
  create: (body: Record<string, unknown>) => apiClient.post(ARTICLES_ENDPOINT, body),
  update: (id: number, body: Record<string, unknown>) => apiClient.put(`${ARTICLES_ENDPOINT}/${id}`, body),
  remove: (id: number) => apiClient.delete(`${ARTICLES_ENDPOINT}/${id}`),
};

/** Thao tác ghi FAQ. */
export const faqActions = {
  create: (body: Record<string, unknown>) => apiClient.post(FAQS_ENDPOINT, body),
  update: (id: number, body: Record<string, unknown>) => apiClient.put(`${FAQS_ENDPOINT}/${id}`, body),
  remove: (id: number) => apiClient.delete(`${FAQS_ENDPOINT}/${id}`),
};
