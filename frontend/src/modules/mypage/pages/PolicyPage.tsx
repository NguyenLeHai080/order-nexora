import ArticleListPage from './ArticleListPage';
import { usePublicArticles } from '../hooks/usePublicContent';

/** Trang Chính sách (route `/danh-muc/chinh-sach`) — dùng ArticleListPage + dữ liệu policy từ API. */
export default function PolicyPage() {
  const { articles, tabs, loading } = usePublicArticles('policy');
  return (
    <ArticleListPage
      title="Chính sách"
      intro="Các chính sách bảo hành, hoàn tiền, bảo mật và điều khoản sử dụng dịch vụ tại NexoraTech — minh bạch, rõ ràng để bạn yên tâm."
      breadcrumb={[{ label: 'Chính sách' }]}
      tabs={tabs}
      articles={articles}
      loading={loading}
    />
  );
}
