import ArticleListPage from './ArticleListPage';
import { usePublicArticles } from '../hooks/usePublicContent';

/** Trang Thủ thuật (route `/danh-muc/thu-thuat`) — dùng ArticleListPage + dữ liệu tips từ API. */
export default function TipsPage() {
  const { articles, tabs, loading } = usePublicArticles('tips');
  return (
    <ArticleListPage
      title="Thủ thuật"
      intro="Mẹo hay, hướng dẫn chi tiết về tài khoản AI, tên miền và VPS — giúp bạn dùng dịch vụ hiệu quả hơn mỗi ngày."
      breadcrumb={[{ label: 'Thủ thuật' }]}
      tabs={tabs}
      articles={articles}
      loading={loading}
    />
  );
}
