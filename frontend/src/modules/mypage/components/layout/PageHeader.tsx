import Breadcrumb, { type Crumb } from './Breadcrumb';

/**
 * Header của các trang nội dung (Dịch vụ, Thủ thuật, Tin tức, FAQ):
 * breadcrumb + tiêu đề H1 + đoạn intro. Nền xám nhạt, căn trái như ufotech.vn.
 */
export default function PageHeader({
  title,
  intro,
  breadcrumb,
}: {
  title: string;
  intro?: string;
  breadcrumb: Crumb[];
}) {
  return (
    <section className="tw-border-b tw-border-neutral-100 tw-bg-[#f7f8fa]">
      <div className="tw-mx-auto tw-max-w-container tw-px-5 tw-py-9">
        <Breadcrumb items={breadcrumb} />
        <h1 className="tw-mt-3 tw-text-[26px] tw-font-extrabold tw-leading-tight tw-text-ink sm:tw-text-[32px]">{title}</h1>
        {intro && <p className="tw-mt-3 tw-max-w-[820px] tw-text-[14.5px] tw-leading-relaxed tw-text-neutral-500">{intro}</p>}
      </div>
    </section>
  );
}
