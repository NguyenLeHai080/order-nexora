/**
 * Tailwind chỉ dùng cho module mypage (trang public, đa trang theo style ufotech.vn).
 * - `content` chỉ quét file trong modules/mypage → không sinh utility cho admin.
 * - `prefix: 'tw-'` → mọi utility có tiền tố `tw-` (vd `tw-p-5`, `hover:tw-bg-gold`).
 *   Đây là cách CHỐNG XUNG ĐỘT với Bootstrap (admin): Bootstrap utility (`p-5`,
 *   `border`, `rounded`, `shadow`… đều `!important`) KHÔNG còn trùng tên nên không
 *   đè được mypage, và utility mypage cũng không rò sang phá admin.
 * - `preflight: false` → KHÔNG reset toàn cục, Bootstrap của trang admin giữ nguyên.
 *   Reset cục bộ cho mypage được làm thủ công trong scope `.mypage` (mypage.css).
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/modules/mypage/**/*.{ts,tsx}'],
  prefix: 'tw-',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: '#c9a44c', light: '#e3c878', dark: '#a9863a' },
        ink: '#1d1d1f',
        accent: { DEFAULT: '#0071e3', dark: '#0058b0' },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      maxWidth: { container: '1200px' },
    },
  },
  plugins: [],
};
