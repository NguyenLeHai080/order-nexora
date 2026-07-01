/**
 * Dữ liệu bài viết (Thủ thuật + Tin tức) — mock theo phong cách ufotech.vn.
 * Tips & News dùng chung shape Article và component ArticleListPage.
 * Mỗi bài có slug + content (thân bài HTML) để render trang chi tiết
 * (/bai-viet/:slug). Khi nối API/CMS thật: thay 2 mảng + giữ nguyên shape.
 */

export interface Article {
  id: number;
  slug: string;
  title: string;
  /** Nhãn danh mục hiển thị trên card. */
  category: string;
  /** key danh mục để lọc tab. */
  categoryKey: string;
  /** Nhóm trang: tips | news (để breadcrumb + bài liên quan). */
  group: 'tips' | 'news';
  date: string;
  author?: string;
  excerpt: string;
  image: string;
  href: string;
  /** Thân bài (HTML rút gọn, mock). */
  content: string;
}

export interface ArticleTab {
  key: string;
  label: string;
  count: number;
}

const IMG = (seed: string) => `https://picsum.photos/seed/${seed}/420/260`;
const HERO = (seed: string) => `https://picsum.photos/seed/${seed}/1200/600`;

/** Thân bài mock dùng chung — sinh vài đoạn + heading + list từ tiêu đề/teaser. */
function body(lead: string): string {
  return `
    <p>${lead}</p>
    <p>Trong bài viết này, NexoraTech sẽ cùng bạn đi qua những điểm quan trọng nhất, từ khái niệm cơ bản đến các bước thực hiện cụ thể, kèm lưu ý để tránh các lỗi thường gặp.</p>
    <h2>Vì sao điều này quan trọng?</h2>
    <p>Việc nắm vững nội dung này giúp bạn tiết kiệm thời gian, hạn chế rủi ro và tận dụng tối đa dịch vụ đang sử dụng. Đây là kiến thức nền tảng mà bất kỳ người dùng nào cũng nên biết.</p>
    <ul>
      <li>Hiểu rõ bản chất vấn đề trước khi bắt tay vào làm.</li>
      <li>Chuẩn bị đầy đủ công cụ và thông tin cần thiết.</li>
      <li>Thực hiện theo từng bước, kiểm tra lại kết quả ở mỗi giai đoạn.</li>
    </ul>
    <h2>Các bước thực hiện</h2>
    <p>Bạn nên làm tuần tự và không bỏ qua bước kiểm tra. Nếu gặp trục trặc, hãy quay lại bước trước đó để rà soát thay vì làm lại từ đầu.</p>
    <blockquote>Mẹo: Lưu lại cấu hình hoạt động tốt để có thể khôi phục nhanh khi cần.</blockquote>
    <p>Nếu bạn cần hỗ trợ thêm, đội ngũ kỹ thuật NexoraTech luôn sẵn sàng đồng hành 24/7 qua Zalo và hotline.</p>
  `;
}

/* ─── Thủ thuật ────────────────────────────────────────────────────────── */

export const TIPS_TABS: ArticleTab[] = [
  { key: 'all', label: 'Tất cả', count: 24 },
  { key: 'ai', label: 'Thủ thuật AI', count: 12 },
  { key: 'domain', label: 'Thủ thuật Domain', count: 5 },
  { key: 'vps', label: 'Thủ thuật VPS', count: 7 },
];

export const TIPS_ARTICLES: Article[] = [
  { id: 1, slug: 'meo-dung-chatgpt-hieu-qua', title: 'Mẹo dùng ChatGPT hiệu quả, tránh bị giới hạn', category: 'Thủ thuật AI', categoryKey: 'ai', group: 'tips', date: '29/06/2026', author: 'NexoraTech', excerpt: 'Tổng hợp các mẹo prompt và thói quen sử dụng giúp bạn khai thác tối đa tài khoản AI mà vẫn an toàn…', image: IMG('nx-tip-1'), href: '/bai-viet/meo-dung-chatgpt-hieu-qua', content: body('ChatGPT là công cụ mạnh, nhưng dùng đúng cách mới phát huy hết sức mạnh và tránh bị giới hạn không đáng có.') },
  { id: 2, slug: 'so-sanh-claude-va-chatgpt-lap-trinh', title: 'So sánh Claude và ChatGPT cho công việc lập trình', category: 'Thủ thuật AI', categoryKey: 'ai', group: 'tips', date: '28/06/2026', author: 'NexoraTech', excerpt: 'Đâu là lựa chọn tốt hơn khi bạn cần một trợ lý AI hỗ trợ viết và rà soát mã nguồn hằng ngày…', image: IMG('nx-tip-2'), href: '/bai-viet/so-sanh-claude-va-chatgpt-lap-trinh', content: body('Cả Claude và ChatGPT đều hỗ trợ lập trình rất tốt, nhưng mỗi công cụ có thế mạnh riêng tùy theo nhu cầu của bạn.') },
  { id: 3, slug: 'cach-tro-ten-mien-vn-ve-hosting', title: 'Cách trỏ tên miền .vn về hosting nhanh nhất', category: 'Thủ thuật Domain', categoryKey: 'domain', group: 'tips', date: '27/06/2026', author: 'NexoraTech', excerpt: 'Hướng dẫn từng bước cấu hình bản ghi DNS để website của bạn hoạt động chỉ sau vài phút…', image: IMG('nx-tip-3'), href: '/bai-viet/cach-tro-ten-mien-vn-ve-hosting', content: body('Trỏ tên miền tưởng phức tạp nhưng chỉ cần hiểu đúng bản ghi DNS là bạn có thể làm trong vài phút.') },
  { id: 4, slug: 'toi-uu-vps-cho-wordpress', title: 'Tối ưu VPS cho website WordPress tải nhanh', category: 'Thủ thuật VPS', categoryKey: 'vps', group: 'tips', date: '26/06/2026', author: 'NexoraTech', excerpt: 'Những thiết lập cache, PHP và web server giúp trang WordPress của bạn nhẹ và nhanh hơn rõ rệt…', image: IMG('nx-tip-4'), href: '/bai-viet/toi-uu-vps-cho-wordpress', content: body('Một VPS cấu hình tốt có thể giúp WordPress tải nhanh gấp nhiều lần mà không cần nâng cấp phần cứng.') },
  { id: 5, slug: 'bao-mat-vps-cho-nguoi-moi', title: 'Bảo mật VPS: 7 việc cần làm ngay sau khi nhận', category: 'Thủ thuật VPS', categoryKey: 'vps', group: 'tips', date: '25/06/2026', author: 'NexoraTech', excerpt: 'Đổi cổng SSH, dựng firewall, tắt đăng nhập mật khẩu… checklist bảo mật VPS cho người mới…', image: IMG('nx-tip-5'), href: '/bai-viet/bao-mat-vps-cho-nguoi-moi', content: body('Ngay khi nhận VPS, vài thao tác bảo mật cơ bản sẽ giúp bạn tránh được phần lớn các cuộc tấn công tự động.') },
  { id: 6, slug: 'viet-prompt-midjourney-dep', title: 'Viết prompt tạo ảnh Midjourney đẹp như designer', category: 'Thủ thuật AI', categoryKey: 'ai', group: 'tips', date: '24/06/2026', author: 'NexoraTech', excerpt: 'Công thức prompt theo bố cục, ánh sáng và phong cách giúp bạn ra ảnh chất lượng cao ngay…', image: IMG('nx-tip-6'), href: '/bai-viet/viet-prompt-midjourney-dep', content: body('Prompt tốt là chìa khóa để Midjourney cho ra ảnh đẹp; hãy mô tả theo bố cục, ánh sáng và phong cách rõ ràng.') },
  { id: 7, slug: 'chon-goi-ten-mien-cho-startup', title: 'Chọn gói tên miền nào cho startup mới?', category: 'Thủ thuật Domain', categoryKey: 'domain', group: 'tips', date: '23/06/2026', author: 'NexoraTech', excerpt: '.com, .vn hay .io — phân tích ưu nhược để bạn chọn đúng tên miền cho thương hiệu non trẻ…', image: IMG('nx-tip-7'), href: '/bai-viet/chon-goi-ten-mien-cho-startup', content: body('Tên miền là bộ mặt thương hiệu; chọn đúng đuôi tên miền ngay từ đầu giúp bạn xây dựng uy tín lâu dài.') },
  { id: 8, slug: 'quan-ly-nhieu-tai-khoan-ai', title: 'Quản lý nhiều tài khoản AI trong cùng trình duyệt', category: 'Thủ thuật AI', categoryKey: 'ai', group: 'tips', date: '22/06/2026', author: 'NexoraTech', excerpt: 'Dùng profile và tiện ích để chuyển đổi tài khoản nhanh, tránh đăng nhập nhầm và mất phiên…', image: IMG('nx-tip-8'), href: '/bai-viet/quan-ly-nhieu-tai-khoan-ai', content: body('Nếu dùng nhiều tài khoản AI, việc tổ chức profile trình duyệt hợp lý sẽ giúp bạn tránh nhầm lẫn và mất phiên.') },
];

/* ─── Tin tức ──────────────────────────────────────────────────────────── */

export const NEWS_TABS: ArticleTab[] = [
  { key: 'all', label: 'Tất cả', count: 18 },
  { key: 'tech', label: 'Tin công nghệ', count: 11 },
  { key: 'ai', label: 'Tin AI', count: 7 },
];

export const NEWS_ARTICLES: Article[] = [
  { id: 101, slug: 'openai-he-lo-mo-hinh-moi', title: 'OpenAI hé lộ mô hình mới với khả năng suy luận vượt trội', category: 'Tin AI', categoryKey: 'ai', group: 'news', date: '30/06/2026', author: 'NexoraTech', excerpt: 'Giới công nghệ xôn xao trước những thông tin về thế hệ mô hình tiếp theo với năng lực lý luận mạnh hơn…', image: IMG('nx-news-1'), href: '/bai-viet/openai-he-lo-mo-hinh-moi', content: body('OpenAI được cho là đang chuẩn bị ra mắt thế hệ mô hình mới với khả năng suy luận vượt xa hiện tại.') },
  { id: 102, slug: 'xu-huong-gia-vps-2026', title: 'Xu hướng giá VPS 2026: hiệu năng tăng, chi phí giảm', category: 'Tin công nghệ', categoryKey: 'tech', group: 'news', date: '29/06/2026', author: 'NexoraTech', excerpt: 'Sự cạnh tranh giữa các nhà cung cấp đám mây đang đem lại lợi ích rõ rệt cho người dùng cuối…', image: IMG('nx-news-2'), href: '/bai-viet/xu-huong-gia-vps-2026', content: body('Cuộc đua hạ tầng đám mây năm 2026 đang khiến giá VPS giảm trong khi hiệu năng ngày càng tăng.') },
  { id: 103, slug: 'google-mo-rong-gemini-workspace', title: 'Google mở rộng Gemini cho người dùng Workspace', category: 'Tin AI', categoryKey: 'ai', group: 'news', date: '28/06/2026', author: 'NexoraTech', excerpt: 'Tính năng AI được tích hợp sâu hơn vào bộ công cụ văn phòng, thay đổi cách chúng ta làm việc…', image: IMG('nx-news-3'), href: '/bai-viet/google-mo-rong-gemini-workspace', content: body('Google tiếp tục đưa Gemini vào sâu hơn trong Workspace, thay đổi cách hàng triệu người làm việc mỗi ngày.') },
  { id: 104, slug: 'ten-mien-ai-sot-gia', title: 'Tên miền .ai tiếp tục sốt giá trên toàn cầu', category: 'Tin công nghệ', categoryKey: 'tech', group: 'news', date: '27/06/2026', author: 'NexoraTech', excerpt: 'Cơn sốt trí tuệ nhân tạo kéo theo nhu cầu sở hữu tên miền .ai tăng vọt trong năm qua…', image: IMG('nx-news-4'), href: '/bai-viet/ten-mien-ai-sot-gia', content: body('Làn sóng AI khiến tên miền .ai trở thành tài sản được săn đón, đẩy giá lên mức cao kỷ lục.') },
  { id: 105, slug: 'canh-bao-lua-dao-tai-khoan-ai', title: 'Cảnh báo thủ đoạn lừa đảo mua bán tài khoản AI giá rẻ', category: 'Tin công nghệ', categoryKey: 'tech', group: 'news', date: '26/06/2026', author: 'NexoraTech', excerpt: 'Người dùng cần cảnh giác với các tài khoản trôi nổi không bảo hành, dễ mất quyền truy cập…', image: IMG('nx-news-5'), href: '/bai-viet/canh-bao-lua-dao-tai-khoan-ai', content: body('Tài khoản AI giá rẻ trôi nổi tiềm ẩn rủi ro lớn; hãy mua từ nguồn uy tín có bảo hành rõ ràng.') },
  { id: 106, slug: 'anthropic-cap-nhat-lon-cho-claude', title: 'Anthropic công bố cập nhật lớn cho Claude', category: 'Tin AI', categoryKey: 'ai', group: 'news', date: '25/06/2026', author: 'NexoraTech', excerpt: 'Bản cập nhật mang đến cửa sổ ngữ cảnh lớn hơn và tốc độ phản hồi cải thiện đáng kể…', image: IMG('nx-news-6'), href: '/bai-viet/anthropic-cap-nhat-lon-cho-claude', content: body('Anthropic vừa nâng cấp Claude với cửa sổ ngữ cảnh lớn hơn và tốc độ phản hồi nhanh hơn đáng kể.') },
];

/* ─── Tổng hợp + tra cứu ──────────────────────────────────────────────── */

export const ALL_ARTICLES: Article[] = [...TIPS_ARTICLES, ...NEWS_ARTICLES];

/** Tìm bài theo slug (dùng cho trang chi tiết). */
export function findArticleBySlug(slug: string | undefined): Article | undefined {
  if (!slug) return undefined;
  return ALL_ARTICLES.find((a) => a.slug === slug);
}

/** Lấy ảnh hero (khổ lớn) từ slug — tái dùng seed của thumbnail. */
export function articleHero(article: Article): string {
  return HERO(article.slug);
}

/** Bài liên quan: cùng group, khác id, tối đa `n` bài. */
export function relatedArticles(article: Article, n = 3): Article[] {
  return ALL_ARTICLES.filter((a) => a.group === article.group && a.id !== article.id).slice(0, n);
}
