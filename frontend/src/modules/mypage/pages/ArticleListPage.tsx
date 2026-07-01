import { useMemo, useState } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import MyPageShell from '../components/MyPageShell';
import PageHeader from '../components/layout/PageHeader';
import type { Crumb } from '../components/layout/Breadcrumb';
import CategoryTabs from '../components/common/CategoryTabs';
import Pagination from '../components/common/Pagination';
import ArticleCard from '../components/cards/ArticleCard';
import type { Article, ArticleTab } from '../data/articlesData';

const PAGE_SIZE = 9;

/**
 * Trang listing bài viết dùng chung cho Thủ thuật & Tin tức:
 * PageHeader + tab lọc (có count) + grid ArticleCard + phân trang.
 * Dữ liệu truyền vào qua props (mock giờ, nối API sau).
 */
export default function ArticleListPage({
  title,
  intro,
  breadcrumb,
  tabs,
  articles,
  loading = false,
}: {
  title: string;
  intro?: string;
  breadcrumb: Crumb[];
  tabs: ArticleTab[];
  articles: Article[];
  loading?: boolean;
}) {
  const [cat, setCat] = useState('all');
  const [page, setPage] = useState(1);
  useScrollReveal([cat, page]);

  const filtered = useMemo(
    () => (cat === 'all' ? articles : articles.filter((a) => a.categoryKey === cat)),
    [cat, articles],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const onTab = (key: string) => {
    setCat(key);
    setPage(1);
  };
  const onPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <MyPageShell>
      <PageHeader title={title} intro={intro} breadcrumb={breadcrumb} />

      <section className="mp-section">
        <div className="mp-container">
          <div className="tw-mb-7">
            <CategoryTabs items={tabs} active={cat} onChange={onTab} />
          </div>

          {loading ? (
            <p className="tw-py-10 tw-text-center tw-text-neutral-400">Đang tải bài viết…</p>
          ) : pageItems.length === 0 ? (
            <p className="tw-py-10 tw-text-center tw-text-neutral-400">Chưa có bài viết trong mục này.</p>
          ) : (
            <div className="tw-grid tw-gap-5 sm:tw-grid-cols-2 lg:tw-grid-cols-3">
              {pageItems.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          )}

          <Pagination current={safePage} total={totalPages} onChange={onPage} />
        </div>
      </section>
    </MyPageShell>
  );
}
