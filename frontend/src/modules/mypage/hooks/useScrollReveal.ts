import { useEffect } from 'react';

/**
 * Hook hiệu ứng "reveal on scroll": phần tử có class `.reveal` sẽ thêm `.is-visible`
 * khi cuộn tới (IntersectionObserver). Tự dọn observer khi unmount.
 *
 * Dùng ở trang Landing để các section mờ-trượt lên khi vào viewport — giống các
 * landing page marketing hiện đại. Không phụ thuộc thư viện ngoài.
 */
export function useScrollReveal(deps: unknown[] = []): void {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (els.length === 0) return;

    // Trình duyệt cũ không hỗ trợ IO -> hiện luôn, không chặn nội dung.
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target); // hiệu ứng chỉ chạy 1 lần
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
