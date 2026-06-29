import type { ReactNode } from 'react';

export interface SectionCardProps {
  /** Tiêu đề nhỏ phía trên (chữ in hoa). */
  title?: string;
  children: ReactNode;
}

/** Khung card có tiêu đề — dùng nhóm nội dung trong trang & gallery. */
export default function SectionCard({ title, children }: SectionCardProps) {
  return (
    <div className="ui-section">
      {title && <div className="ui-section-title">{title}</div>}
      {children}
    </div>
  );
}
