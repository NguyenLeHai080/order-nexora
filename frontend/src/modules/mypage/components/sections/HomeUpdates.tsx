import ArticleCard from '../cards/ArticleCard';
import Tabs from '../common/Tabs';
import { usePublicArticles } from '../../hooks/usePublicContent';

/**
 * Section "Thủ thuật & Tin tức" trang chủ — Tabs 2 nhóm, mỗi nhóm grid ArticleCard
 * (lấy 3 bài mới nhất). Style ufotech.vn "Updates". Dữ liệu từ API public.
 */
export default function HomeUpdates() {
  const { articles: tips } = usePublicArticles('tips');
  const { articles: news } = usePublicArticles('news');

  return (
    <section className="mp-section">
      <div className="mp-container">
        <div className="mp-head reveal">
          <span className="mp-eyebrow">Cập nhật</span>
          <h2 className="mp-title">Thủ thuật &amp; Tin tức mới nhất</h2>
          <p className="mp-subtitle">Kiến thức, mẹo hay và tin nóng về AI, Domain, VPS.</p>
        </div>

        <Tabs
          tabs={[
            {
              key: 'tips',
              label: 'Thủ thuật',
              render: () => (
                <div className="tw-grid tw-gap-5 sm:tw-grid-cols-2 lg:tw-grid-cols-3">
                  {tips.slice(0, 3).map((a) => (
                    <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
              ),
            },
            {
              key: 'news',
              label: 'Tin tức',
              render: () => (
                <div className="tw-grid tw-gap-5 sm:tw-grid-cols-2 lg:tw-grid-cols-3">
                  {news.slice(0, 3).map((a) => (
                    <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}
