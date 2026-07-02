/**
 * Sao đánh giá — chế độ đọc (hiển thị) hoặc nhập (chọn 1–5).
 * Dùng cho khối đánh giá sản phẩm trên landing (theme gold).
 */
export function StarRating({
  value,
  size = 16,
}: {
  value: number;
  size?: number;
}) {
  const full = Math.round(value);
  return (
    <span className="tw-inline-flex tw-items-center tw-gap-0.5 tw-text-gold" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <i key={n} className={`bi ${n <= full ? 'bi-star-fill' : 'bi-star'}`} />
      ))}
    </span>
  );
}

/** Sao có thể chọn (input) cho form đánh giá. */
export function StarInput({
  value,
  onChange,
  size = 24,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <span className="tw-inline-flex tw-items-center tw-gap-1" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} sao`}
          className={`tw-transition-colors ${n <= value ? 'tw-text-gold' : 'tw-text-neutral-300'} hover:tw-text-gold`}
        >
          <i className={`bi ${n <= value ? 'bi-star-fill' : 'bi-star'}`} />
        </button>
      ))}
    </span>
  );
}
