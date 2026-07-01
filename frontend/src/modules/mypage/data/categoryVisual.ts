/**
 * Visual theo danh mục: gradient nền fallback (khi không có ảnh),
 * icon Bootstrap, và màu badge overlay trên ảnh.
 */

export interface CategoryVisual {
  icon: string;
  gradient: string;  // Tailwind gradient classes cho nền fallback
  badge: string;     // hex màu nền badge pill overlay trên ảnh
}

const RULES: { match: string[]; visual: CategoryVisual }[] = [
  {
    match: ['chatgpt', 'openai', 'claude', 'grok', 'gemini', 'gemeni', 'google', 'gamma', 'ai', 'bot'],
    visual: { icon: 'bi-robot',       gradient: 'from-[#10a37f] to-[#0b6e57]', badge: '#10a37f' },
  },
  {
    match: ['canva', 'adobe', 'capcut', 'meitu', 'xingtu', 'wink', 'design', 'photo'],
    visual: { icon: 'bi-palette2',    gradient: 'from-[#7c3aed] to-[#4c1d95]', badge: '#7c3aed' },
  },
  {
    match: ['netflix', 'spotify', 'youtube', 'locket', 'music', 'video'],
    visual: { icon: 'bi-play-circle', gradient: 'from-[#e11d48] to-[#7f1d1d]', badge: '#e11d48' },
  },
  {
    match: ['domain', 'tên miền', 'ten mien'],
    visual: { icon: 'bi-globe2',      gradient: 'from-[#2563eb] to-[#1e3a8a]', badge: '#2563eb' },
  },
  {
    match: ['vps', 'hosting', 'server', 'cloud'],
    visual: { icon: 'bi-hdd-network', gradient: 'from-[#0891b2] to-[#155e75]', badge: '#0891b2' },
  },
  {
    match: ['zoom', 'microsoft', 'office', 'meet'],
    visual: { icon: 'bi-camera-video',gradient: 'from-[#0ea5e9] to-[#075985]', badge: '#0ea5e9' },
  },
];

const DEFAULT_VISUAL: CategoryVisual = {
  icon: 'bi-box-seam',
  gradient: 'from-[#c9a44c] to-[#a9863a]',
  badge: '#c9a44c',
};

export function categoryVisual(
  categoryName?: string | null,
  productName?: string | null,
): CategoryVisual {
  const hay = `${categoryName ?? ''} ${productName ?? ''}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.match.some((kw) => hay.includes(kw))) return rule.visual;
  }
  return DEFAULT_VISUAL;
}
