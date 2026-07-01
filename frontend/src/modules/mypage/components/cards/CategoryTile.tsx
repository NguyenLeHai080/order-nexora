/**
 * Card danh mục ảnh lớn — dùng ở đầu trang Dịch vụ (slider ngang, style ufotech.vn).
 * Ảnh phủ kín, overlay tối nhẹ, tiêu đề + mũi tên ở dưới.
 *
 * Hành vi click: ưu tiên `onClick` (vd lọc danh sách tại chỗ); nếu không có thì
 * điều hướng theo `href`.
 */
import { useSmartNav } from '../layout/useSmartNav';

export interface CategoryTileData {
  label: string;
  image: string;
  href?: string;
}

export default function CategoryTile({
  data,
  active = false,
  onClick,
}: {
  data: CategoryTileData;
  active?: boolean;
  onClick?: () => void;
}) {
  const nav = useSmartNav();
  const handle = () => {
    if (onClick) onClick();
    else if (data.href) nav(data.href);
  };
  return (
    <button
      type="button"
      onClick={handle}
      aria-pressed={active}
      className={`tw-group tw-relative tw-block tw-aspect-[4/3] tw-w-full tw-cursor-pointer tw-overflow-hidden tw-rounded-2xl tw-transition-shadow ${
        active
          ? 'tw-ring-2 tw-ring-gold tw-ring-offset-2 tw-shadow-[0_8px_24px_rgba(201,164,76,0.4)]'
          : 'hover:tw-shadow-lg'
      }`}
    >
      <img
        src={data.image}
        alt={data.label}
        loading="lazy"
        className="tw-h-full tw-w-full tw-object-cover tw-transition-transform tw-duration-500 group-hover:tw-scale-110"
      />
      <span className="tw-absolute tw-inset-0 tw-bg-gradient-to-t tw-from-black/70 tw-via-black/15 tw-to-transparent" />
      <span className="tw-absolute tw-inset-x-0 tw-bottom-0 tw-flex tw-items-center tw-justify-between tw-gap-2 tw-p-4 tw-text-left">
        <span className="tw-text-[15.5px] tw-font-bold tw-leading-snug tw-text-white tw-drop-shadow">{data.label}</span>
        <span
          className={`tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-text-white tw-backdrop-blur tw-transition-colors ${
            active ? 'tw-bg-gold tw-text-black' : 'tw-bg-white/20 group-hover:tw-bg-gold group-hover:tw-text-black'
          }`}
        >
          <i className="bi bi-arrow-right" />
        </span>
      </span>
    </button>
  );
}
