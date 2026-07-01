import { useEffect, useState } from 'react';
import {
  fetchPublicCategories,
  fetchPublicProduct,
  fetchPublicProducts,
  type PublicCategory,
  type PublicListParams,
  type PublicProduct,
} from '../api/publicClient';

/** Danh sách sản phẩm public (theo filter). */
export function usePublicProducts(params: PublicListParams = {}) {
  const [items, setItems] = useState<PublicProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ổn định dependency: serialize params để effect chỉ chạy khi giá trị đổi.
  const key = JSON.stringify(params);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchPublicProducts(params)
      .then((res) => {
        if (!alive) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(() => alive && setError('Không tải được danh sách sản phẩm.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { items, total, loading, error };
}

/** Chi tiết 1 sản phẩm public theo slug. */
export function usePublicProduct(slug: string | undefined) {
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetchPublicProduct(slug)
      .then((p) => alive && setProduct(p))
      .catch(() => alive && setError('Không tìm thấy sản phẩm.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  return { product, loading, error };
}

/** Danh mục public (có sản phẩm active) để dựng tab/nhóm. */
export function usePublicCategories() {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchPublicCategories()
      .then((c) => alive && setCategories(c))
      .catch(() => alive && setCategories([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { categories, loading };
}
