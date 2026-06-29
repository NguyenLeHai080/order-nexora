import { Card } from 'react-bootstrap';

// Thẻ thống kê kiểu Velzon: nhãn + giá trị lớn + icon nền màu.
export default function StatCard({
  label,
  value,
  icon,
  color = 'primary',
}: {
  label: string;
  value: string | number;
  icon: string;
  color?: 'primary' | 'success' | 'info' | 'warning' | 'danger' | 'secondary';
}) {
  return (
    <Card className="stat-card h-100">
      <Card.Body className="d-flex align-items-center justify-content-between">
        <div>
          <div className="stat-label mb-2">{label}</div>
          <div className="stat-value">{value}</div>
        </div>
        <div className={`stat-icon bg-${color}-subtle text-${color}`}>
          <i className={`bi ${icon}`} />
        </div>
      </Card.Body>
    </Card>
  );
}
