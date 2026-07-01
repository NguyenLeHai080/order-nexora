import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import MyPageShell from '../components/MyPageShell';
import HomeHero from '../components/sections/HomeHero';
import HomeAbout from '../components/sections/HomeAbout';
import HomeFeaturedServices from '../components/sections/HomeFeaturedServices';
import HomeProcess from '../components/sections/HomeProcess';
import HomeTestimonials from '../components/sections/HomeTestimonials';
import HomeUpdates from '../components/sections/HomeUpdates';

/** Bắt lỗi render để trang không trắng tinh — hiện thông báo + chi tiết để debug. */
class PageErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MyPageErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: 24, background: '#fff', color: '#1d1d1f' }}>
          <p style={{ fontSize: 18, marginBottom: 12, color: '#a9863a' }}>⚠ Có lỗi khi tải trang. Vui lòng thử lại.</p>
          <pre style={{ fontSize: 12, color: '#dc2626', background: '#f5f6f8', padding: 16, borderRadius: 8, maxWidth: 700, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error.message}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '10px 24px', background: '#c9a44c', color: '#000', fontWeight: 700, border: 'none', borderRadius: 999, cursor: 'pointer' }}>
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Trang chủ public NexoraTech (route `/`) — dựng theo home ufotech.vn. */
export default function HomePage() {
  useScrollReveal();
  return (
    <PageErrorBoundary>
      <MyPageShell>
        <main>
          <HomeHero />
          <HomeAbout />
          <HomeFeaturedServices />
          <HomeProcess />
          <HomeTestimonials />
          <HomeUpdates />
        </main>
      </MyPageShell>
    </PageErrorBoundary>
  );
}
