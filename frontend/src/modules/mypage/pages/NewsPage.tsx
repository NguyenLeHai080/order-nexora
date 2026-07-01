import ArticleListPage from './ArticleListPage';
import { usePublicArticles } from '../hooks/usePublicContent';

/** Trang Tin tức (route `/danh-muc/tin-tuc`) — dùng ArticleListPage + dữ liệu news từ API. */
export default function NewsPage() {
  const { articles, tabs, loading } = usePublicArticles('news');
  return (
    <ArticleListPage
      title="Tin tức"
      intro="Tin nóng về công nghệ, AI và thị trường dịch vụ số — cập nhật nhanh để bạn không bỏ lỡ điều gì."
      breadcrumb={[{ label: 'Tin tức' }]}
      tabs={tabs}
      articles={articles}
      loading={loading}
    />
  );
}
