import { useParams } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal';
import MyPageShell from '../components/MyPageShell';
import PageHeader from '../components/layout/PageHeader';
import ArticleCard from '../components/cards/ArticleCard';
import EngagementList from '../components/engagement/EngagementList';
import CommentForm from '../components/engagement/CommentForm';
import { useSmartNav } from '../components/layout/useSmartNav';
import { BRAND } from '../data/siteData';
import { usePublicArticle, articleHeroFromSlug } from '../hooks/usePublicContent';
import { usePublicComments } from '../hooks/usePublicEngagement';
import { submitComment } from '../api/engagementClient';

/**
 * Trang chi tiết 1 bài viết (route public `/bai-viet/:slug`) — dựng theo trang
 * bài viết ufotech.vn: breadcrumb + tiêu đề + meta (ngày/tác giả/danh mục) +
 * ảnh hero + thân bài + chia sẻ + bài liên quan. Dữ liệu lấy từ API public.
 */
export default function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { article, related, loading } = usePublicArticle(slug);
  const comments = usePublicComments(article?.id);
  const nav = useSmartNav();
  useScrollReveal([slug, loading]);

  if (loading) {
    return (
      <MyPageShell>
        <section className="mp-section">
          <div className="mp-container tw-py-24 tw-text-center tw-text-neutral-500">Đang tải bài viết…</div>
        </section>
      </MyPageShell>
    );
  }

  if (!article) {
    return (
      <MyPageShell>
        <PageHeader title="Không tìm thấy bài viết" breadcrumb={[{ label: 'Bài viết' }]} />
        <section className="mp-section">
          <div className="mp-container tw-py-10 tw-text-center">
            <p className="tw-text-neutral-500">Bài viết bạn tìm không tồn tại hoặc đã bị gỡ.</p>
            <button
              type="button"
              onClick={() => nav('/danh-muc/tin-tuc')}
              className="tw-mt-4 tw-inline-flex tw-items-center tw-gap-1.5 tw-font-semibold tw-text-gold-dark hover:tw-underline"
            >
              <i className="bi bi-arrow-left" /> Về trang tin tức
            </button>
          </div>
        </section>
      </MyPageShell>
    );
  }

  const groupCrumb =
    article.group === 'tips'
      ? { label: 'Thủ thuật', href: '/danh-muc/thu-thuat' }
      : article.group === 'policy'
        ? { label: 'Chính sách', href: '/danh-muc/chinh-sach' }
        : { label: 'Tin tức', href: '/danh-muc/tin-tuc' };
  const shareUrl = typeof window !== 'undefined' ? window.location.href : article.href;

  return (
    <MyPageShell>
      <PageHeader
        title={article.title}
        breadcrumb={[groupCrumb, { label: article.category }]}
      />

      <section className="mp-section">
        <div className="mp-container tw-max-w-[860px]">
          {/* Meta */}
          <div className="tw-mb-5 tw-flex tw-flex-wrap tw-items-center tw-gap-x-4 tw-gap-y-1.5 tw-text-[13px] tw-text-neutral-500">
            <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-gold/10 tw-px-2.5 tw-py-[3px] tw-font-bold tw-text-gold-dark">
              {article.category}
            </span>
            <span className="tw-inline-flex tw-items-center tw-gap-1.5">
              <i className="bi bi-calendar3" />{article.date}
            </span>
            {article.author && (
              <span className="tw-inline-flex tw-items-center tw-gap-1.5">
                <i className="bi bi-person" />{article.author}
              </span>
            )}
          </div>

          {/* Ảnh hero */}
          <figure className="reveal tw-mb-7 tw-overflow-hidden tw-rounded-2xl tw-border tw-border-neutral-200">
            <img src={articleHeroFromSlug(article.slug)} alt={article.title} className="tw-h-auto tw-w-full tw-object-cover" />
          </figure>

          {/* Thân bài */}
          <article
            className="mp-article reveal"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Chia sẻ */}
          <div className="tw-mt-9 tw-flex tw-flex-wrap tw-items-center tw-gap-3 tw-border-t tw-border-neutral-200 tw-pt-6">
            <span className="tw-text-[13.5px] tw-font-semibold tw-text-ink">Chia sẻ bài viết:</span>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-full tw-bg-[#1877f2] tw-text-white"
              aria-label="Chia sẻ Facebook"
            >
              <i className="bi bi-facebook" />
            </a>
            <a
              href={BRAND.zalo}
              target="_blank"
              rel="noreferrer"
              className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-full tw-bg-[#0068ff] tw-text-[12px] tw-font-extrabold tw-text-white"
              aria-label="Chia sẻ Zalo"
            >
              Z
            </a>
          </div>

          {/* Bình luận */}
          <div className="tw-mt-10 tw-border-t tw-border-neutral-200 tw-pt-8">
            <h2 className="tw-mb-5 tw-flex tw-items-center tw-gap-2 tw-text-[18px] tw-font-bold tw-text-ink">
              <i className="bi bi-chat-left-text tw-text-gold" />
              Bình luận
              {comments.items.length > 0 && (
                <span className="tw-text-[15px] tw-font-normal tw-text-neutral-400">({comments.items.length})</span>
              )}
            </h2>
            <div className="tw-mb-6">
              <CommentForm
                placeholder="Chia sẻ suy nghĩ của bạn về bài viết…"
                submitLabel="Gửi bình luận"
                onSubmit={async (body) => {
                  const msg = await submitComment(article.id, body);
                  comments.reload();
                  return msg;
                }}
              />
            </div>
            <EngagementList items={comments.items} emptyText="Chưa có bình luận. Hãy là người đầu tiên chia sẻ!" />
          </div>
        </div>
      </section>

      {/* Bài liên quan */}
      {related.length > 0 && (
        <section className="mp-section mp-section--soft" style={{ paddingTop: 0 }}>
          <div className="mp-container tw-pt-12">
            <div className="mp-head tw-mb-7">
              <h2 className="mp-title">Bài viết liên quan</h2>
            </div>
            <div className="tw-grid tw-gap-5 sm:tw-grid-cols-2 lg:tw-grid-cols-3">
              {related.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}
    </MyPageShell>
  );
}
