/**
 * Sinh ảnh "cover" tự động cho sản phẩm/dịch vụ — KHÔNG cần tải ảnh ngoài.
 *
 * Ưu tiên LOGO THƯƠNG HIỆU THẬT: nếu tên sản phẩm khớp một hãng trong
 * `brandLogos` (ChatGPT→OpenAI, Claude, Gemini, Midjourney, Spotify, Netflix…),
 * vẽ banner = nền gradient màu hãng + logo thật (trắng) + glow + tên — giống
 * banner thương hiệu (kiểu ảnh ChatGPT/OpenAI). Sản phẩm không thuộc hãng nào
 * (domain, VPS chung…) dùng icon Bootstrap đặc trưng theo `categoryVisual`.
 *
 * Trả `data:image/svg+xml,...` dùng thẳng cho `<img src>` — card KHÔNG đổi markup.
 * Ảnh do admin upload (`image_url`) luôn được ưu tiên trước hàm này (xem adapter).
 */
import { BRAND_LOGOS } from './brandLogos';
import { categoryVisual } from './categoryVisual';

/** Từ khóa trong tên/danh mục -> key hãng trong BRAND_LOGOS. Khớp đầu tiên thắng. */
const BRAND_RULES: { brand: string; kw: string[] }[] = [
  { brand: 'openai', kw: ['chatgpt', 'openai', 'gpt', 'dall-e', 'dalle', 'sora'] },
  { brand: 'claude', kw: ['claude', 'anthropic'] },
  { brand: 'gemini', kw: ['gemini', 'gemeni', 'bard', 'google ai'] },
  { brand: 'midjourney', kw: ['midjourney'] },
  { brand: 'grok', kw: ['grok'] },
  { brand: 'adobe', kw: ['adobe', 'lightroom', 'photoshop', 'premiere'] },
  { brand: 'capcut', kw: ['capcut'] },
  { brand: 'jetbrains', kw: ['jetbrains'] },
  { brand: 'kiro', kw: ['kiro'] },
  { brand: 'discord', kw: ['discord', 'discrod'] },
  { brand: 'spotify', kw: ['spotify'] },
  { brand: 'netflix', kw: ['netflix'] },
  { brand: 'youtube', kw: ['youtube'] },
  { brand: 'zoom', kw: ['zoom'] },
  { brand: 'cloudflare', kw: ['cloudflare'] },
  { brand: 'wordpress', kw: ['wordpress'] },
  { brand: 'vultr', kw: ['vultr'] },
  { brand: 'digitalocean', kw: ['digitalocean', 'digital ocean'] },
  { brand: 'googlecloud', kw: ['google cloud', 'gcp'] },
  { brand: 'microsoft', kw: ['microsoft', 'windows', 'window', 'office', 'azure'] },
];

/** Path bên trong <svg viewBox="0 0 16 16"> của icon Bootstrap (fallback khi không có logo hãng). */
const ICON_PATHS: Record<string, string> = {
  'bi-robot':
    '<path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135"/><path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2zM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5"/>',
  'bi-palette2':
    '<path d="M0 .5A.5.5 0 0 1 .5 0h5a.5.5 0 0 1 .5.5v5.277l4.147-4.131a.5.5 0 0 1 .707 0l3.535 3.536a.5.5 0 0 1 0 .708L10.261 10H15.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H3a3 3 0 0 1-2.121-.879A3 3 0 0 1 0 13.044m6-.21 7.328-7.3-2.829-2.828L6 7.188zM4.5 13a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0M15 15v-4H9.258l-4.015 4zM0 .5v12.495zm0 12.495V13z"/>',
  'bi-play-circle':
    '<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M6.271 5.055a.5.5 0 0 1 .52.038l3.5 2.5a.5.5 0 0 1 0 .814l-3.5 2.5A.5.5 0 0 1 6 10.5v-5a.5.5 0 0 1 .271-.445"/>',
  'bi-globe2':
    '<path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855q-.215.403-.395.872c.705.157 1.472.257 2.282.287zM4.249 3.539q.214-.577.481-1.078a7 7 0 0 1 .597-.933A7 7 0 0 0 3.051 3.05q.544.277 1.198.49zM3.509 7.5c.036-1.07.188-2.087.436-3.008a9 9 0 0 1-1.565-.667A6.96 6.96 0 0 0 1.018 7.5zm1.4-2.741a12.3 12.3 0 0 0-.4 2.741H7.5V5.091c-.91-.03-1.783-.145-2.591-.332M8.5 5.09V7.5h2.99a12.3 12.3 0 0 0-.399-2.741c-.808.187-1.681.301-2.591.332zM4.51 8.5c.035.987.176 1.914.399 2.741A13.6 13.6 0 0 1 7.5 10.91V8.5zm3.99 0v2.409c.91.03 1.783.145 2.591.332.223-.827.364-1.754.4-2.741zm-3.282 3.696q.18.469.395.872c.552 1.035 1.218 1.65 1.887 1.855V11.91c-.81.03-1.577.13-2.282.287zm.11 2.276a7 7 0 0 1-.598-.933 9 9 0 0 1-.481-1.079 8.4 8.4 0 0 0-1.198.49 7 7 0 0 0 2.276 1.522zm-1.383-2.964A13.4 13.4 0 0 1 3.508 8.5h-2.49a6.96 6.96 0 0 0 1.362 3.675c.47-.258.995-.482 1.565-.667m6.728 2.964a7 7 0 0 0 2.275-1.521 8.4 8.4 0 0 0-1.197-.49 9 9 0 0 1-.481 1.078 7 7 0 0 1-.597.933M8.5 11.909v3.014c.67-.204 1.335-.82 1.887-1.855q.216-.403.395-.872A12.6 12.6 0 0 0 8.5 11.91zm3.555-.401c.57.185 1.095.409 1.565.667A6.96 6.96 0 0 0 14.982 8.5h-2.49a13.4 13.4 0 0 1-.437 3.008M14.982 7.5a6.96 6.96 0 0 0-1.362-3.675c-.47.258-.995.482-1.565.667.248.92.4 1.938.437 3.008zM11.27 2.461q.266.502.482 1.078a8.4 8.4 0 0 0 1.196-.49 7 7 0 0 0-2.275-1.52c.218.283.418.597.597.932m-.488 1.343a8 8 0 0 0-.395-.872C9.835 1.897 9.17 1.282 8.5 1.077V4.09c.81-.03 1.577-.13 2.282-.287z"/>',
  'bi-hdd-network':
    '<path d="M4.5 5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M3 4.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H8.5v3a1.5 1.5 0 0 1 1.5 1.5h5.5a.5.5 0 0 1 0 1H10A1.5 1.5 0 0 1 8.5 14h-1A1.5 1.5 0 0 1 6 12.5H.5a.5.5 0 0 1 0-1H6A1.5 1.5 0 0 1 7.5 10V7H2a2 2 0 0 1-2-2zm1 0v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1m6 7.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5"/>',
  'bi-camera-video':
    '<path fill-rule="evenodd" d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2zm11.5 5.175 3.5 1.556V4.269l-3.5 1.556zM2 4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z"/>',
  'bi-box-seam':
    '<path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2zm3.564 1.426L5.596 5 8 5.961 14.154 3.5zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"/>',
};

/** Đổi độ sáng màu hex (factor <1 tối đi, >1 sáng lên). */
function shade(hex: string, factor: number): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const f = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * factor))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Tên rút gọn để vẽ trên banner (tránh tràn). */
function shortLabel(name: string): string {
  const t = name.trim();
  return t.length > 30 ? `${t.slice(0, 29)}…` : t;
}

const W = 640;
const H = 400;
const CX = W / 2;
const CY = 168;

/** Bọc nội dung SVG -> data-URI cho <img src>. */
function toDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Tìm hãng khớp tên/danh mục (nếu có). */
function matchBrand(hay: string): string | null {
  for (const rule of BRAND_RULES) {
    if (rule.kw.some((kw) => hay.includes(kw))) return rule.brand;
  }
  return null;
}

/** Banner LOGO THẬT: nền gradient màu hãng + logo trắng + glow + tên. viewBox logo 0 0 24 24. */
function brandCover(brandKey: string, label: string, withLabel: boolean): string {
  const { path, hex } = BRAND_LOGOS[brandKey];
  const c1 = shade(hex, 0.55);
  const c2 = shade(hex, 1.05);
  const glow = shade(hex, 1.7);

  // Có nhãn → logo lệch lên (chừa chỗ chữ); không nhãn → căn giữa khung.
  const cy = withLabel ? CY : H / 2;
  // Logo (viewBox 24) cao ~150px -> scale 6.25; căn giữa tại (CX, cy).
  const S = 6.25;
  const tx = CX - 12 * S;
  const ty = cy - 12 * S;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>` +
    `<radialGradient id="gl" cx="0.5" cy="0.42" r="0.5">` +
    `<stop offset="0" stop-color="${glow}" stop-opacity="0.55"/>` +
    `<stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>` +
    `<rect width="${W}" height="${H}" fill="url(#gl)"/>` +
    `<circle cx="${CX}" cy="${cy}" r="118" fill="none" stroke="#fff" stroke-opacity="0.14" stroke-width="2"/>` +
    `<circle cx="${CX}" cy="${cy}" r="150" fill="none" stroke="#fff" stroke-opacity="0.07" stroke-width="2"/>` +
    `<g fill="#ffffff" transform="translate(${tx} ${ty}) scale(${S})">${path}</g>` +
    (withLabel
      ? `<text x="${CX}" y="350" text-anchor="middle" ` +
        `font-family="'Be Vietnam Pro','Segoe UI',system-ui,sans-serif" ` +
        `font-size="30" font-weight="700" fill="#ffffff">${escapeXml(label)}</text>`
      : '') +
    `</svg>`;
  return toDataUri(svg);
}

/** Cover chung (không thuộc hãng nào): gradient categoryVisual + icon Bootstrap. */
function genericCover(
  name: string,
  categoryName: string | null | undefined,
  label: string,
  withLabel: boolean,
): string {
  const v = categoryVisual(categoryName, name);
  const stops = v.gradient.match(/#[0-9a-fA-F]{6}/g) ?? [];
  const c1 = stops[0] ?? '#c9a44c';
  const c2 = stops[1] ?? stops[0] ?? '#a9863a';
  const iconPath = ICON_PATHS[v.icon] ?? ICON_PATHS['bi-box-seam'];
  const cy = withLabel ? CY : H / 2;
  // Icon viewBox 16 -> scale 11 để cao ~176px, căn giữa.
  const S = 11;
  const tx = CX - 8 * S;
  const ty = cy - 8 * S;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#g)"/>` +
    `<circle cx="560" cy="70" r="130" fill="#fff" opacity="0.08"/>` +
    `<circle cx="70" cy="370" r="100" fill="#fff" opacity="0.06"/>` +
    `<g fill="#ffffff" opacity="0.92" transform="translate(${tx} ${ty}) scale(${S})">${iconPath}</g>` +
    (withLabel && label
      ? `<text x="40" y="356" font-family="'Be Vietnam Pro','Segoe UI',system-ui,sans-serif" ` +
        `font-size="30" font-weight="700" fill="#fff">${escapeXml(label)}</text>`
      : '') +
    `</svg>`;
  return toDataUri(svg);
}

/**
 * Ảnh cover tự sinh cho sản phẩm/dịch vụ. Khớp logo hãng thật trước, không thì
 * dùng icon đặc trưng theo danh mục. Khổ 16:10 (640×400) khớp `aspect-[16/10]`.
 *
 * `withLabel=false` → KHÔNG vẽ tên vào ảnh (dùng cho card đã có nhãn riêng đè
 * lên, tránh lặp chữ như "CanvaCanva"); logo được căn giữa khung.
 */
export function productCover(
  name?: string | null,
  categoryName?: string | null,
  withLabel = true,
): string {
  const hay = `${categoryName ?? ''} ${name ?? ''}`.toLowerCase();
  const label = shortLabel(name ?? '');
  const brand = matchBrand(hay);
  return brand
    ? brandCover(brand, label, withLabel)
    : genericCover(name ?? '', categoryName, label, withLabel);
}
