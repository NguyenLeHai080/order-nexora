/**
 * Dữ liệu dịch vụ (mock theo phong cách ufotech.vn — "không giá, CTA Xem thêm").
 * Khi nối API thật: thay SERVICE_CATEGORIES/SERVICES bằng dữ liệu từ public API.
 */

export interface ServiceCategory {
  id: number;
  /** Slug dùng cho tab lọc + link. */
  key: string;
  label: string;
  image: string;
}

export interface ServiceItem {
  id: number;
  /** key của ServiceCategory chứa dịch vụ này. */
  categoryKey: string;
  categoryLabel: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  href: string;
}

const IMG = (seed: string, w = 420, h = 300) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

/** 4 danh mục dịch vụ lớn — hiển thị dạng CategoryTile ảnh lớn. */
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 1, key: 'ai', label: 'Tài khoản AI', image: IMG('nx-cat-ai', 600, 400) },
  { id: 2, key: 'domain', label: 'Tên miền (Domain)', image: IMG('nx-cat-domain', 600, 400) },
  { id: 3, key: 'vps', label: 'VPS / Hosting', image: IMG('nx-cat-vps', 600, 400) },
  { id: 4, key: 'other', label: 'Dịch vụ khác', image: IMG('nx-cat-other', 600, 400) },
];

export const SERVICES: ServiceItem[] = [
  {
    id: 1, categoryKey: 'ai', categoryLabel: 'Tài khoản AI',
    title: 'Tài khoản ChatGPT Plus chính chủ',
    excerpt: 'Kích hoạt GPT-4o, truy cập nhanh, ổn định — bàn giao tự động ngay sau thanh toán.',
    date: '30/06/2026', image: IMG('nx-svc-chatgpt'), href: '/dich-vu',
  },
  {
    id: 2, categoryKey: 'ai', categoryLabel: 'Tài khoản AI',
    title: 'Tài khoản Claude Pro (Anthropic)',
    excerpt: 'Trải nghiệm Claude với giới hạn cao, phù hợp lập trình & viết nội dung dài.',
    date: '30/06/2026', image: IMG('nx-svc-claude'), href: '/dich-vu',
  },
  {
    id: 3, categoryKey: 'ai', categoryLabel: 'Tài khoản AI',
    title: 'Tài khoản Gemini Advanced',
    excerpt: 'Gemini bản nâng cao của Google, tích hợp sâu hệ sinh thái Workspace.',
    date: '30/06/2026', image: IMG('nx-svc-gemini'), href: '/dich-vu',
  },
  {
    id: 4, categoryKey: 'ai', categoryLabel: 'Tài khoản AI',
    title: 'Gói Midjourney tạo ảnh AI',
    excerpt: 'Tạo ảnh chất lượng cao không giới hạn ý tưởng, phù hợp thiết kế & marketing.',
    date: '30/06/2026', image: IMG('nx-svc-mj'), href: '/dich-vu',
  },
  {
    id: 5, categoryKey: 'domain', categoryLabel: 'Tên miền',
    title: 'Đăng ký tên miền .com quốc tế',
    excerpt: 'Sở hữu tên miền .com chuyên nghiệp, quản trị DNS dễ dàng, gia hạn linh hoạt.',
    date: '30/06/2026', image: IMG('nx-svc-com'), href: '/dich-vu',
  },
  {
    id: 6, categoryKey: 'domain', categoryLabel: 'Tên miền',
    title: 'Đăng ký tên miền .vn / .com.vn',
    excerpt: 'Khẳng định thương hiệu Việt với tên miền quốc gia, hỗ trợ hồ sơ đầy đủ.',
    date: '30/06/2026', image: IMG('nx-svc-vn'), href: '/dich-vu',
  },
  {
    id: 7, categoryKey: 'vps', categoryLabel: 'VPS / Hosting',
    title: 'VPS phổ thông SSD tốc độ cao',
    excerpt: 'Cấu hình linh hoạt, băng thông lớn, uptime cao — sẵn sàng cho website & ứng dụng.',
    date: '30/06/2026', image: IMG('nx-svc-vps'), href: '/dich-vu',
  },
  {
    id: 8, categoryKey: 'vps', categoryLabel: 'VPS / Hosting',
    title: 'Hosting / Cloud cho website',
    excerpt: 'Hosting tối ưu WordPress & mã nguồn phổ biến, backup tự động, bảo mật tốt.',
    date: '30/06/2026', image: IMG('nx-svc-hosting'), href: '/dich-vu',
  },
  {
    id: 9, categoryKey: 'other', categoryLabel: 'Dịch vụ khác',
    title: 'Gói nâng cấp & gia hạn tài khoản',
    excerpt: 'Hỗ trợ nâng cấp, gia hạn các tài khoản dịch vụ số đang dùng một cách nhanh chóng.',
    date: '30/06/2026', image: IMG('nx-svc-upgrade'), href: '/dich-vu',
  },
  {
    id: 10, categoryKey: 'other', categoryLabel: 'Dịch vụ khác',
    title: 'Tư vấn giải pháp số cho doanh nghiệp',
    excerpt: 'Đồng hành tư vấn lựa chọn tài khoản AI, hạ tầng VPS phù hợp nhu cầu thực tế.',
    date: '30/06/2026', image: IMG('nx-svc-consult'), href: '/dich-vu',
  },
];

/** "Vì sao chọn NexoraTech" — điểm mạnh dạng icon + tiêu đề + mô tả. */
export interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
}
export const WHY_FEATURES: FeatureItem[] = [
  { icon: 'bi-lightning-charge-fill', title: 'Giao tự động 24/7', desc: 'Nhận tài khoản ngay sau khi thanh toán, không cần chờ đợi.' },
  { icon: 'bi-shield-check', title: 'Bảo hành rõ ràng', desc: 'Cam kết 1 đổi 1 trong thời gian bảo hành từng sản phẩm.' },
  { icon: 'bi-tags-fill', title: 'Giá tốt, cập nhật liên tục', desc: 'Mức giá cạnh tranh, nhiều ưu đãi cho thành viên.' },
  { icon: 'bi-headset', title: 'Hỗ trợ tận tâm', desc: 'Đội ngũ kỹ thuật trực tuyến 24/7 qua Zalo & hotline.' },
];

/** Quy trình 4 bước (Tabs). */
export interface ProcessStep {
  id: number;
  step: string;
  title: string;
  desc: string;
  image: string;
}
export const PROCESS_STEPS: ProcessStep[] = [
  { id: 1, step: 'Bước 1', title: 'Chọn dịch vụ', desc: 'Duyệt danh mục tài khoản AI, Domain, VPS và chọn gói phù hợp nhu cầu.', image: IMG('nx-step-1', 560, 380) },
  { id: 2, step: 'Bước 2', title: 'Thanh toán bằng ví', desc: 'Nạp ví một lần qua VietQR, thanh toán nhanh không cần nhập lại thông tin.', image: IMG('nx-step-2', 560, 380) },
  { id: 3, step: 'Bước 3', title: 'Nhận bàn giao tự động', desc: 'Hệ thống cấp phát tài khoản/thông tin ngay sau khi thanh toán thành công.', image: IMG('nx-step-3', 560, 380) },
  { id: 4, step: 'Bước 4', title: 'Bảo hành & hỗ trợ', desc: 'Theo dõi đơn, yêu cầu bảo hành và nhận hỗ trợ kỹ thuật 24/7.', image: IMG('nx-step-4', 560, 380) },
];

/** Cảm nhận khách hàng. */
export interface Testimonial {
  id: number;
  name: string;
  role: string;
  service: string;
  quote: string;
  avatar: string;
}
export const TESTIMONIALS: Testimonial[] = [
  { id: 1, name: 'Nguyễn Minh Quân', role: 'Lập trình viên', service: 'Tài khoản Claude Pro', quote: 'Nhận tài khoản chỉ sau vài giây, dùng để code rất ổn định. Hỗ trợ nhiệt tình.', avatar: IMG('nx-ava-1', 120, 120) },
  { id: 2, name: 'Trần Thu Hà', role: 'Marketing', service: 'Gói Midjourney', quote: 'Tạo ảnh AI cho chiến dịch quá tiện. Giá tốt hơn mua trực tiếp nhiều.', avatar: IMG('nx-ava-2', 120, 120) },
  { id: 3, name: 'Lê Hoàng Nam', role: 'Chủ shop online', service: 'VPS + Domain .vn', quote: 'Đăng ký domain và VPS chỉ trong buổi sáng, web chạy mượt, yên tâm hẳn.', avatar: IMG('nx-ava-3', 120, 120) },
];
