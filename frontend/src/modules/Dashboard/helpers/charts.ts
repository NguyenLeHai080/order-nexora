import type { ApexOptions } from 'apexcharts';
import { formatNumber } from '../../../core/format';
import type { LeaderRow, UserStats } from '../hooks/useDashboard';

/** Cấu hình biểu đồ cột: top khách hàng theo chi tiêu. */
export function buildBarChart(leaders: LeaderRow[]): { series: { name: string; data: number[] }[]; options: ApexOptions } {
  return {
    series: [{ name: 'Đã chi', data: leaders.map((l) => parseFloat(l.total_spent || '0')) }],
    options: {
      chart: { type: 'bar', toolbar: { show: false } },
      colors: ['#405189'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
      dataLabels: { enabled: false },
      xaxis: { categories: leaders.map((l) => l.user_name) },
      yaxis: { labels: { formatter: (v: number) => formatNumber(v) } },
      grid: { borderColor: '#e9ebec' },
    },
  };
}

/** Cấu hình biểu đồ tròn: phân bố trạng thái tài khoản. */
export function buildDonutChart(userStats?: UserStats): { series: number[]; options: ApexOptions } {
  return {
    series: userStats ? [userStats.active, userStats.locked] : [],
    options: {
      chart: { type: 'donut' },
      labels: ['Hoạt động', 'Đã khóa'],
      colors: ['#0ab39c', '#f06548'],
      legend: { position: 'bottom' },
    },
  };
}
