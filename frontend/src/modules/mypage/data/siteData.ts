/**
 * Dữ liệu site-wide cho mypage — BRAND, NAV (mega-menu), FOOTER.
 * Nội dung tĩnh (mock theo phong cách ufotech.vn). Khi nối API thật, thay các
 * mảng này bằng dữ liệu động; cấu trúc giữ nguyên để component không phải sửa.
 */

export interface NavChild {
  label: string;
  href: string;
  /** Ảnh thumbnail cho mega-menu (tùy chọn). */
  image?: string;
}
export interface NavGroup {
  /** Tiêu đề nhóm trong mega-menu. */
  heading: string;
  items: NavChild[];
}
export interface NavItem {
  label: string;
  href: string;
  /** Dropdown đơn giản. */
  children?: NavChild[];
  /** Mega-menu nhiều nhóm (Dịch vụ). */
  groups?: NavGroup[];
}

export const BRAND = {
  company: 'NEXORATECH',
  name: 'NexoraTech',
  tagline: 'AI ACCOUNTS · DOMAIN · VPS',
  address: 'Tầng 5, Toà nhà Nexora, Cầu Giấy, Hà Nội',
  phone: '0888 99 9981',
  hotlineNote: 'Hỗ trợ kỹ thuật 24/7',
  csknPhone: '0888 88 8866',
  floatPhone: '0888999981',
  hours: 'T2–CN: 8h30 Sáng – 18h00 Chiều',
  email: 'support@nexoratech.com.vn',
  zalo: 'https://zalo.me/0888999981',
  facebook: 'https://facebook.com/nexoratech',
  slogan: 'Đồng hành cùng bạn trên hành trình số',
  since: 2015,
};

/** Ảnh mega-menu — dùng picsum seed (thay ảnh thật sau). */
const T = (seed: string) => `https://picsum.photos/seed/${seed}/120/80`;

export const NAV_ITEMS: NavItem[] = [
  { label: 'Về NexoraTech', href: '/#about' },
  {
    label: 'Dịch vụ',
    href: '/dich-vu',
    groups: [
      {
        heading: 'Tài khoản AI',
        items: [
          { label: 'ChatGPT / OpenAI', href: '/dich-vu', image: T('nx-chatgpt') },
          { label: 'Claude / Anthropic', href: '/dich-vu', image: T('nx-claude') },
          { label: 'Gemini / Google AI', href: '/dich-vu', image: T('nx-gemini') },
        ],
      },
      {
        heading: 'Domain',
        items: [
          { label: 'Tên miền .com', href: '/dich-vu', image: T('nx-domain-com') },
          { label: 'Tên miền .vn', href: '/dich-vu', image: T('nx-domain-vn') },
        ],
      },
      {
        heading: 'VPS / Hosting',
        items: [
          { label: 'VPS phổ thông', href: '/dich-vu', image: T('nx-vps') },
          { label: 'Hosting / Cloud', href: '/dich-vu', image: T('nx-hosting') },
        ],
      },
    ],
  },
  {
    label: 'Linh kiện',
    href: '/dich-vu',
    children: [
      { label: 'Bản quyền phần mềm', href: '/dich-vu' },
      { label: 'Gói nâng cấp tài khoản', href: '/dich-vu' },
    ],
  },
  { label: 'Thủ thuật', href: '/danh-muc/thu-thuat' },
  { label: 'Tin tức', href: '/danh-muc/tin-tuc' },
  {
    label: 'Chính sách',
    href: '/#about',
    children: [
      { label: 'Chính sách bảo hành', href: '/#about' },
      { label: 'Chính sách hoàn tiền', href: '/#about' },
      { label: 'Chính sách bảo mật', href: '/#about' },
    ],
  },
  { label: 'FAQs', href: '/faq' },
  { label: 'Liên hệ', href: '/#contact' },
];

export const FOOTER_LINKS = {
  services: [
    { label: 'Tài khoản ChatGPT / OpenAI', href: '/dich-vu' },
    { label: 'Tài khoản Claude / Gemini', href: '/dich-vu' },
    { label: 'Đăng ký tên miền .com / .vn', href: '/dich-vu' },
    { label: 'VPS / Hosting tốc độ cao', href: '/dich-vu' },
  ],
  content: [
    { label: 'Thủ thuật', href: '/danh-muc/thu-thuat' },
    { label: 'Tin tức', href: '/danh-muc/tin-tuc' },
    { label: 'Hỏi đáp (FAQ)', href: '/faq' },
    { label: 'Về NexoraTech', href: '/#about' },
  ],
  support: [
    { label: 'Chính sách bảo hành', href: '/#about' },
    { label: 'Hướng dẫn nạp ví', href: '/#about' },
    { label: 'Chính sách hoàn tiền', href: '/#about' },
    { label: 'Hình thức thanh toán', href: '/#contact' },
  ],
};

/** Slide hero trang chủ — chữ tối trên nền sáng (overlay trắng). */
export const HERO_SLIDES = [
  {
    id: 1,
    eyebrow: 'GIẢI PHÁP SỐ TOÀN DIỆN',
    title: 'Tài khoản AI bản quyền\ngiao tự động trong vài giây',
    desc: 'ChatGPT, Claude, Gemini, Midjourney… giá tốt, bảo hành rõ ràng, kích hoạt ngay sau thanh toán.',
    cta: 'Khám phá dịch vụ',
    href: '/dich-vu',
    image: 'https://picsum.photos/seed/nexora-hero-ai/1600/720',
  },
  {
    id: 2,
    eyebrow: 'HẠ TẦNG CHO DỰ ÁN CỦA BẠN',
    title: 'Domain & VPS tốc độ cao\nsẵn sàng để bứt phá',
    desc: 'Đăng ký tên miền, thuê VPS/Hosting ổn định — đồng hành cùng bạn trên hành trình số.',
    cta: 'Xem bảng dịch vụ',
    href: '/dich-vu',
    image: 'https://picsum.photos/seed/nexora-hero-cloud/1600/720',
  },
];
