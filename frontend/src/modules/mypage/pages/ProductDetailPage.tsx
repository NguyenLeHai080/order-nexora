import { useParams } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { formatCurrency, resolveAsset } from '../../../core/format';
import MyPageShell, { useMyPage } from '../components/MyPageShell';
import { usePublicProduct } from '../hooks/usePublicProducts';
import { usePublicReviews, usePublicDiscussions } from '../hooks/usePublicEngagement';
import { submitReview, submitDiscussion } from '../api/engagementClient';
import EngagementList from '../components/engagement/EngagementList';
import ReviewForm from '../components/engagement/ReviewForm';
import CommentForm from '../components/engagement/CommentForm';
import { StarRating } from '../components/engagement/StarRating';
import { useCartStore } from '../store/cartStore';
import type { PublicProduct } from '../api/publicClient';
import { categoryVisual } from '../data/categoryVisual';
import '../mypage.css';

/** Nhãn loại giao hàng cho người mua. */
function deliveryLabel(type: string | null): string {
  switch (type) {
    case 'MANUAL':
      return 'Bàn giao thủ công (nhân viên cấp phát)';
    case 'AUTO':
      return 'Giao tự động sau thanh toán';
    default:
      return 'Giao theo quy trình sản phẩm';
  }
}

/** Nội dung trang chi tiết (cần shell context cho giỏ/auth). */
function DetailContent({ product }: { product: PublicProduct }) {
  const addToCart = useCartStore((s) => s.add);
  const { openCart, isLoggedIn, openAuth } = useMyPage();
  const reviews = usePublicReviews(product.id);
  const discussions = usePublicDiscussions(product.id);

  const price = parseFloat(product.price);
  const regular = product.regular_price ? parseFloat(product.regular_price) : null;
  const hasDiscount = regular !== null && regular > price;
  const discountPct = hasDiscount ? Math.round((1 - price / (regular as number)) * 100) : 0;
  const img = resolveAsset(product.image_url);
  const outOfStock = product.stock_status === 'out_of_stock';
  const visual = categoryVisual(product.category_name, product.name);
  const ratingAvg = reviews.summary.average || product.rating?.average || 0;
  const ratingCount = reviews.summary.count || product.rating?.count || 0;

  const addItem = () => {
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image_url,
      price,
    });
  };

  const handleAddToCart = () => {
    addItem();
    openCart();
  };

  const handleBuyNow = () => {
    addItem();
    if (!isLoggedIn) {
      openAuth('login');
    }
    openCart();
  };

  return (
    <main className="mp-section">
      <div className="mp-container">
        {/* Breadcrumb */}
        <nav className="tw-mb-5 tw-text-[13px] tw-text-neutral-500">
          <a href="/" className="hover:tw-text-gold-dark">Trang chủ</a>
          <span className="tw-mx-2">/</span>
          <a href="/#products" className="hover:tw-text-gold-dark">Sản phẩm</a>
          {product.category_name && (
            <>
              <span className="tw-mx-2">/</span>
              <span>{product.category_name}</span>
            </>
          )}
        </nav>

        <div className="tw-grid tw-gap-8 lg:tw-grid-cols-2">
          {/* Ảnh */}
          <div className="tw-relative tw-overflow-hidden tw-rounded-2xl tw-border tw-border-black/10 tw-bg-[#f5f5f3]">
            <div className="tw-aspect-[4/3]">
              {img ? (
                <img src={img} alt={product.name} className="tw-h-full tw-w-full tw-object-cover" />
              ) : (
                <span
                  className={`tw-flex tw-h-full tw-w-full tw-flex-col tw-items-center tw-justify-center tw-bg-gradient-to-br ${visual.gradient} tw-px-6 tw-text-center tw-text-white`}
                >
                  <i className={`bi ${visual.icon} tw-text-7xl tw-opacity-90`} />
                  <span className="tw-mt-3 tw-text-[16px] tw-font-semibold tw-opacity-95">{product.name}</span>
                </span>
              )}
            </div>
            {hasDiscount && (
              <span className="tw-absolute tw-left-3 tw-top-3 tw-rounded-full tw-bg-red-600 tw-px-3 tw-py-1 tw-text-[13px] tw-font-bold tw-text-white">
                -{discountPct}%
              </span>
            )}
          </div>

          {/* Thông tin */}
          <div>
            {product.category_name && (
              <span
                className="tw-inline-block tw-rounded-full tw-px-3 tw-py-[3px] tw-text-[12px] tw-font-bold tw-text-white"
                style={{ background: visual.badge }}
              >
                {product.category_name}
              </span>
            )}
            <h1 className="tw-mt-1 tw-text-[26px] tw-font-extrabold tw-leading-tight tw-text-neutral-900">{product.name}</h1>
            {product.name_en && <p className="tw-mt-1 tw-text-[14px] tw-text-neutral-500">{product.name_en}</p>}

            {ratingCount > 0 && (
              <a href="#reviews" className="tw-mt-2 tw-inline-flex tw-items-center tw-gap-2 tw-text-[13.5px] tw-text-neutral-500 hover:tw-text-gold-dark">
                <StarRating value={ratingAvg} size={15} />
                <span className="tw-font-semibold tw-text-ink">{ratingAvg.toFixed(1)}</span>
                <span>({ratingCount} đánh giá)</span>
              </a>
            )}

            <div className="tw-mt-4 tw-flex tw-items-end tw-gap-3">
              <span className="tw-text-[30px] tw-font-extrabold tw-text-gold-dark">{formatCurrency(price)}</span>
              {hasDiscount && (
                <span className="tw-pb-1 tw-text-[16px] tw-text-neutral-400 tw-line-through">{formatCurrency(regular)}</span>
              )}
            </div>

            <ul className="tw-mt-5 tw-space-y-2 tw-text-[14px] tw-text-neutral-700">
              <li>
                <i className="bi bi-truck tw-mr-2 tw-text-gold" />
                {deliveryLabel(product.delivery_type)}
              </li>
              {product.warranty_days > 0 && (
                <li>
                  <i className="bi bi-shield-check tw-mr-2 tw-text-gold" />
                  Bảo hành {product.warranty_days} ngày
                </li>
              )}
              <li>
                <i className={`tw-mr-2 ${outOfStock ? 'bi bi-x-circle tw-text-red-500' : 'bi bi-check-circle tw-text-green-600'}`} />
                {outOfStock ? 'Tạm hết hàng' : 'Còn hàng'}
              </li>
              {product.sold_count > 0 && (
                <li>
                  <i className="bi bi-bag-check tw-mr-2 tw-text-gold" />
                  Đã bán {product.sold_count}
                </li>
              )}
            </ul>

            <div className="tw-mt-7 tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row">
              <button
                type="button"
                disabled={outOfStock}
                onClick={handleBuyNow}
                className="tw-flex tw-flex-1 tw-items-center tw-justify-center tw-gap-2 tw-rounded-full tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-py-3.5 tw-text-[14.5px] tw-font-bold tw-uppercase tw-text-black tw-shadow-[0_4px_16px_rgba(201,164,76,0.45)] tw-transition-all hover:-tw-translate-y-px hover:tw-shadow-[0_7px_24px_rgba(201,164,76,0.6)] active:tw-translate-y-0 disabled:tw-cursor-not-allowed disabled:tw-opacity-50 disabled:tw-shadow-none"
              >
                <i className="bi bi-lightning-fill" />
                Mua ngay
              </button>
              <button
                type="button"
                disabled={outOfStock}
                onClick={handleAddToCart}
                className="tw-flex tw-flex-1 tw-items-center tw-justify-center tw-gap-2 tw-rounded-full tw-border tw-border-gold/60 tw-py-3.5 tw-text-[14.5px] tw-font-bold tw-text-gold-dark tw-transition-all hover:tw-border-gold hover:tw-bg-gold/10 active:tw-bg-gold/15 disabled:tw-cursor-not-allowed disabled:tw-opacity-50"
              >
                <i className="bi bi-cart-plus" />Thêm vào giỏ
              </button>
            </div>
          </div>
        </div>

        {/* Mô tả */}
        {product.description && (
          <div className="tw-mt-10 tw-rounded-2xl tw-border tw-border-black/10 tw-bg-white tw-p-6">
            <h2 className="tw-mb-3 tw-text-[18px] tw-font-bold tw-text-neutral-900">Mô tả sản phẩm</h2>
            <div className="tw-whitespace-pre-wrap tw-text-[14.5px] tw-leading-relaxed tw-text-neutral-700">
              {product.description}
            </div>
          </div>
        )}

        {/* Đánh giá sản phẩm */}
        <div id="reviews" className="tw-mt-10 tw-scroll-mt-24">
          <div className="tw-mb-5 tw-flex tw-flex-wrap tw-items-center tw-gap-3">
            <h2 className="tw-text-[18px] tw-font-bold tw-text-neutral-900">Đánh giá sản phẩm</h2>
            {ratingCount > 0 && (
              <span className="tw-inline-flex tw-items-center tw-gap-2 tw-text-[14px] tw-text-neutral-500">
                <StarRating value={ratingAvg} size={15} />
                <span className="tw-font-semibold tw-text-ink">{ratingAvg.toFixed(1)}/5</span>
                <span>· {ratingCount} lượt</span>
              </span>
            )}
          </div>
          <div className="tw-mb-6">
            <ReviewForm
              onSubmit={async (body) => {
                const msg = await submitReview(product.id, body);
                reviews.reload();
                return msg;
              }}
            />
          </div>
          <EngagementList
            items={reviews.items}
            showRating
            emptyText="Chưa có đánh giá nào cho sản phẩm này."
          />
        </div>

        {/* Thảo luận / hỏi đáp */}
        <div className="tw-mt-10 tw-border-t tw-border-neutral-200 tw-pt-8">
          <h2 className="tw-mb-5 tw-flex tw-items-center tw-gap-2 tw-text-[18px] tw-font-bold tw-text-neutral-900">
            <i className="bi bi-chat-dots tw-text-gold" />
            Hỏi đáp &amp; thảo luận
            {discussions.items.length > 0 && (
              <span className="tw-text-[15px] tw-font-normal tw-text-neutral-400">({discussions.items.length})</span>
            )}
          </h2>
          <div className="tw-mb-6">
            <CommentForm
              placeholder="Đặt câu hỏi hoặc trao đổi về sản phẩm này…"
              submitLabel="Gửi câu hỏi"
              onSubmit={async (body) => {
                const msg = await submitDiscussion(product.id, body);
                discussions.reload();
                return msg;
              }}
            />
          </div>
          <EngagementList items={discussions.items} emptyText="Chưa có trao đổi nào. Hãy đặt câu hỏi đầu tiên!" />
        </div>
      </div>
    </main>
  );
}

/**
 * Trang chi tiết 1 sản phẩm (route public `/san-pham/:slug`).
 * Lấy dữ liệu qua API public theo slug; bọc trong MyPageShell để dùng chung
 * header/giỏ/auth với mypage.
 */
export default function ProductDetailPage() {
  useScrollReveal();
  const { slug } = useParams<{ slug: string }>();
  const { product, loading, error } = usePublicProduct(slug);

  return (
    <MyPageShell>
      {loading ? (
        <main className="mp-section">
          <div className="mp-container tw-py-24 tw-text-center tw-text-neutral-500">Đang tải sản phẩm…</div>
        </main>
      ) : error || !product ? (
        <main className="mp-section">
          <div className="mp-container tw-py-24 tw-text-center">
            <p className="tw-mb-4 tw-text-neutral-600">{error || 'Không tìm thấy sản phẩm.'}</p>
            <a href="/#products" className="tw-font-semibold tw-text-gold-dark hover:tw-underline">
              ← Quay lại danh sách sản phẩm
            </a>
          </div>
        </main>
      ) : (
        <DetailContent product={product} />
      )}
    </MyPageShell>
  );
}
