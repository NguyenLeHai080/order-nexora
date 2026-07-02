import { useEffect, useState } from 'react';
import { resolveAsset } from '../../../core/format';
import {
  fetchPublicArticle,
  fetchPublicArticles,
  fetchPublicFaqs,
  fetchPublicProducts,
  fetchPublicCategories,
  type PublicArticle,
} from '../api/publicClient';
import type { Article, ArticleTab } from '../data/articlesData';
import type { FaqItem } from '../data/faqData';
import type { ServiceCategory, ServiceItem } from '../data/servicesData';
import { productCover } from '../data/productCover';

/* ─── Helpers ─────────────────────────────────────────────────────────────
 * Map dữ liệu API (snake_case) -> đúng shape mà component đang dùng, để KHÔNG
 * phải đổi giao diện. Ảnh thiếu -> placeholder picsum theo slug (giống mock cũ).
 */

/** ISO datetime -> 'DD/MM/YYYY' (khớp format ngày của bản mock). */
function dmy(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Ảnh thumbnail placeholder ổn định theo seed (giống bản mock dùng picsum). */
const thumb = (seed: string) => `https://picsum.photos/seed/${seed}/420/260`;
/** Ảnh hero khổ lớn theo slug (khớp articleHero của bản mock). */
export const articleHeroFromSlug = (slug: string) =>
  `https://picsum.photos/seed/${slug}/1200/600`;

/** PublicArticle (API) -> Article (shape FE component đang dùng). */
function toArticle(a: PublicArticle): Article {
  const group: Article['group'] =
    a.group === 'news' ? 'news' : a.group === 'policy' ? 'policy' : 'tips';
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    category: a.category,
    categoryKey: a.category_key,
    group,
    date: dmy(a.published_at),
    author: a.author ?? undefined,
    excerpt: a.excerpt ?? '',
    image: resolveAsset(a.image_url) || thumb(a.slug),
    href: `/bai-viet/${a.slug}`,
    content: a.content ?? '',
  };
}

/** Dựng tab lọc (có count) từ danh sách bài viết — thay TIPS_TABS/NEWS_TABS tĩnh. */
function buildTabs(articles: Article[]): ArticleTab[] {
  const tabs: ArticleTab[] = [{ key: 'all', label: 'Tất cả', count: articles.length }];
  const seen = new Map<string, { label: string; count: number }>();
  for (const a of articles) {
    const entry = seen.get(a.categoryKey);
    if (entry) entry.count += 1;
    else seen.set(a.categoryKey, { label: a.category, count: 1 });
  }
  for (const [key, { label, count }] of seen) tabs.push({ key, label, count });
  return tabs;
}

/* ─── Hooks ───────────────────────────────────────────────────────────── */

/** Danh sách bài viết theo nhóm (tips|news|policy) + tab lọc dựng từ dữ liệu thật. */
export function usePublicArticles(group: 'tips' | 'news' | 'policy') {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchPublicArticles({ group, limit: 100 })
      .then((res) => alive && setArticles(res.items.map(toArticle)))
      .catch(() => alive && setArticles([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [group]);

  return { articles, tabs: buildTabs(articles), loading };
}

/** Chi tiết 1 bài viết theo slug + bài liên quan (đã kèm trong response). */
export function usePublicArticle(slug: string | undefined) {
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    fetchPublicArticle(slug)
      .then((a) => {
        if (!alive) return;
        setArticle(toArticle(a));
        setRelated((a.related ?? []).map(toArticle));
      })
      .catch(() => alive && setError('Không tìm thấy bài viết.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  return { article, related, loading, error };
}

/** Danh sách FAQ public (shape FaqItem). */
export function usePublicFaqs() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchPublicFaqs()
      .then((items) => alive && setFaqs(items.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))))
      .catch(() => alive && setFaqs([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { faqs, loading };
}

/**
 * Dịch vụ nổi bật = sản phẩm thật, map sang shape ServiceItem/ServiceCategory
 * mà ServicesPage/HomeFeaturedServices đang dùng. "Xem thêm" trỏ về trang chi
 * tiết sản phẩm thật. Ảnh thiếu -> placeholder theo slug (giữ bố cục card).
 */
export function usePublicServices() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([fetchPublicProducts({ sort: 'popular', limit: 100 }), fetchPublicCategories()])
      .then(([prodRes, cats]) => {
        if (!alive) return;
        setServices(
          prodRes.items.map((p) => ({
            id: p.id,
            categoryKey: String(p.category_id ?? 'other'),
            categoryLabel: p.category_name ?? 'Dịch vụ',
            title: p.name,
            excerpt: p.description ?? '',
            date: dmy(p.created_at),
            image: resolveAsset(p.image_url) || productCover(p.name, p.category_name),
            href: `/san-pham/${p.slug}`,
          })),
        );
        setCategories(
          cats.map((c) => ({
            id: c.id,
            key: String(c.id),
            label: c.name,
            image: productCover(c.name, c.name, false),
          })),
        );
      })
      .catch(() => {
        if (!alive) return;
        setServices([]);
        setCategories([]);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { services, categories, loading };
}
