/**
 * Logo NexoraTech — wordmark dùng chung cho header, footer, modal auth.
 * Mark hình lục giác chứa chữ "N" với gradient gold, cạnh chữ "NexoraTech".
 * Tự chứa SVG (không cần file ảnh) để khớp theme đen + gold.
 *
 * Props:
 * - size: chiều cao mark (px), chữ scale theo. Mặc định 34.
 * - showText: ẩn/hiện wordmark (chỉ lấy mark). Mặc định true.
 * - tagline: hiện dòng tagline nhỏ dưới tên. Mặc định false.
 * - dark: chữ wordmark màu tối (#1d1d1f) để dùng trên nền SÁNG. Mặc định false
 *   (chữ trắng — dùng trên nền tối như footer).
 */
export default function NexoraLogo({
  size = 34,
  showText = true,
  tagline = false,
  dark = false,
  className = '',
}: {
  size?: number;
  showText?: boolean;
  tagline?: boolean;
  dark?: boolean;
  className?: string;
}) {
  const gradId = 'nexora-gold';
  return (
    <span className={`tw-inline-flex tw-items-center tw-gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="tw-shrink-0"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e3c878" />
            <stop offset="1" stopColor="#a9863a" />
          </linearGradient>
        </defs>
        {/* Lục giác viền gold */}
        <path
          d="M24 2.5 43.6 13.75v22.5L24 47.5 4.4 36.25v-22.5z"
          stroke={`url(#${gradId})`}
          strokeWidth="2.5"
          fill="rgba(201,164,76,0.08)"
        />
        {/* Chữ N cách điệu */}
        <path
          d="M17 33V15l14 18V15"
          stroke={`url(#${gradId})`}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showText && (
        <span className="tw-leading-none">
          <span
            className={`tw-block tw-font-extrabold tw-tracking-wide ${dark ? 'tw-text-ink' : 'tw-text-white'}`}
            style={{ fontSize: size * 0.55 }}
          >
            Nexora<span className="tw-text-gold-dark">Tech</span>
          </span>
          {tagline && (
            <span className="tw-mt-0.5 tw-block tw-tracking-[2px] tw-text-gold-dark" style={{ fontSize: size * 0.26 }}>
              AI · DOMAIN · VPS
            </span>
          )}
        </span>
      )}
    </span>
  );
}
