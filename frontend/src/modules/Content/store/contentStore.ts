import { createListStore } from '../../../core/createListStore';
import type { Article, Faq } from '../hooks/useContent';

/** Store UI module bài viết (modal thêm/sửa, xác nhận xóa). */
export const useArticleStore = createListStore<Article>();

/** Store UI module FAQ. */
export const useFaqStore = createListStore<Faq>();
