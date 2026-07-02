import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../../core/apiClient';
import { useAuthStore } from '../../../core/authStore';

/** Đơn cần xử lý hiển thị trong dropdown chuông. */
export interface OrderAlert {
  id: number;
  code: string;
  status: string;
  product_name: string;
  quantity: number;
  total_amount: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  is_guest: boolean;
  created_at: string | null;
  paid_at: string | null;
}

interface AlertsResponse {
  processing_count: number;
  awaiting_count: number;
  latest_id: number;
  recent: OrderAlert[];
}

const POLL_MS = 20000; // 20s — đủ nhanh cho panel admin, nhẹ cho server + tunnel.
const SEEN_KEY = 'nexora-orders-seen-id';

/** Phát tiếng "ting" ngắn bằng WebAudio (không cần file âm thanh). */
function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {
    /* trình duyệt chặn autoplay — bỏ qua, vẫn có badge + toast */
  }
}

/**
 * Poll `/orders/alerts` định kỳ để admin nhận đơn mới mà KHÔNG cần load lại trang.
 *
 * Vì sao polling thay vì SSE/WebSocket: backend chạy sau tunnel + watchdog tự
 * restart uvicorn (kết nối dài sẽ đứt), và auth là Bearer header (EventSource/WS
 * không gửi được header tùy chỉnh). Polling dùng lại apiClient (tự gắn Bearer),
 * sống sót qua restart, 20s là đủ cho panel 1-2 admin.
 *
 * Trả về badge count + danh sách đơn cần xử lý + toast đơn mới (tự tắt sau vài giây).
 */
export function useOrderNotifications() {
  const canView = useAuthStore((s) => s.can('index', 'Order'));
  const [alerts, setAlerts] = useState<OrderAlert[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [newOrder, setNewOrder] = useState<OrderAlert | null>(null);

  // id đơn lớn nhất đã "thấy" — chỉ báo khi có id lớn hơn. Khởi tạo từ localStorage
  // để reload trang không báo lại đơn cũ.
  const seenIdRef = useRef<number>(Number(localStorage.getItem(SEEN_KEY) || 0));
  const initializedRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await apiClient.get('/orders/alerts');
      const data: AlertsResponse = res.data.data;
      setAlerts(data.recent || []);
      setPendingCount((data.processing_count || 0) + (data.awaiting_count || 0));

      const latest = data.latest_id || 0;
      if (!initializedRef.current) {
        // Lần poll đầu: chỉ ghi nhận mốc, KHÔNG báo (tránh spam khi mới mở trang).
        initializedRef.current = true;
        if (latest > seenIdRef.current) {
          seenIdRef.current = latest;
          localStorage.setItem(SEEN_KEY, String(latest));
        }
        return;
      }
      if (latest > seenIdRef.current) {
        // Có đơn mới hơn mốc đã thấy → báo đơn mới nhất.
        const fresh = (data.recent || []).find((o) => o.id === latest) || data.recent?.[0] || null;
        seenIdRef.current = latest;
        localStorage.setItem(SEEN_KEY, String(latest));
        if (fresh) {
          setNewOrder(fresh);
          playBeep();
        }
      }
    } catch {
      /* lỗi mạng tạm thời — bỏ qua, poll lần sau */
    }
  }, []);

  useEffect(() => {
    if (!canView) return;
    void poll();
    const timer = window.setInterval(() => {
      // Không poll khi tab ẩn — tiết kiệm request, poll ngay khi quay lại tab.
      if (document.visibilityState === 'visible') void poll();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [canView, poll]);

  const dismissNew = useCallback(() => setNewOrder(null), []);

  return { alerts, pendingCount, newOrder, dismissNew, refresh: poll };
}
