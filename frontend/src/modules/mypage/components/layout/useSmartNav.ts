import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Điều hướng "thông minh" cho menu public:
 * - href dạng "/path#hash": nếu khác trang hiện tại → chuyển route rồi cuộn tới #hash;
 *   nếu cùng trang → chỉ cuộn (scrollIntoView, mượt, không reload).
 * - href dạng "/path": chuyển route (SPA, không reload).
 * - href dạng "#hash": cuộn trong trang hiện tại.
 * - href ngoài (http…): mở như link thường.
 */
export function useSmartNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToHash = useCallback((hash: string) => {
    const id = hash.replace('#', '');
    if (!id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return useCallback(
    (href: string) => {
      if (/^https?:\/\//.test(href) || href.startsWith('tel:') || href.startsWith('mailto:')) {
        window.location.href = href;
        return;
      }
      const [path, hash] = href.split('#');
      // Link chỉ hash → cuộn trong trang.
      if (path === '' && hash) {
        scrollToHash(`#${hash}`);
        return;
      }
      // Cùng path → chỉ cuộn (nếu có hash) hoặc lên đầu.
      if (path === location.pathname) {
        scrollToHash(hash ? `#${hash}` : '');
        return;
      }
      // Khác path → điều hướng SPA; nếu có hash, cuộn sau khi render.
      navigate(path);
      if (hash) {
        window.setTimeout(() => scrollToHash(`#${hash}`), 80);
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    },
    [navigate, location.pathname, scrollToHash],
  );
}
