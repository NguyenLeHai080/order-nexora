/** Cấu hình module Content: endpoint + tùy chọn nhóm/trạng thái bài viết & FAQ. */

export const ARTICLES_ENDPOINT = '/articles';
export const FAQS_ENDPOINT = '/faqs';

export const ARTICLE_GROUP_OPTIONS = [
  { value: 'tips', label: 'Thủ thuật' },
  { value: 'news', label: 'Tin tức' },
  { value: 'policy', label: 'Chính sách' },
];

export const ARTICLE_GROUP_LABELS: Record<string, string> = {
  tips: 'Thủ thuật',
  news: 'Tin tức',
  policy: 'Chính sách',
};

export const CONTENT_STATUS_OPTIONS = [
  { value: 'active', label: 'Hiển thị' },
  { value: 'inactive', label: 'Ẩn' },
];
