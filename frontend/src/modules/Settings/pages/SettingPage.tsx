import { Alert, Card, Col, Form, Row } from 'react-bootstrap';
import PageHeader from '../../../components/PageHeader';
import { Loader } from '../../../ui';
import { useSettings } from '../hooks/useSettings';
import SettingRow from '../components/SettingRow';
import AddSettingForm from '../components/AddSettingForm';

export default function SettingPage() {
  const { settings, maintenance, loading, savingKey, toast, toggleMaintenance, saveSetting } = useSettings();

  if (loading) {
    return <div className="text-center py-5"><Loader /></div>;
  }

  return (
    <>
      <PageHeader title="Cài đặt hệ thống" breadcrumb="Hệ thống › Cài đặt" />

      {toast && <Alert variant={toast.type}>{toast.msg}</Alert>}

      <Row className="g-3">
        <Col xl={5}>
          <Card className="mb-3">
            <Card.Header>Chế độ bảo trì</Card.Header>
            <Card.Body>
              <p className="text-muted">
                Khi bật, mọi API mua bán bị chặn (trừ đăng nhập và tài liệu). Dùng khi cần nâng cấp hệ thống.
              </p>
              <div className="d-flex align-items-center justify-content-between p-3 rounded bg-light">
                <span className="fw-semibold">
                  <i className={`bi ${maintenance ? 'bi-cone-striped text-warning' : 'bi-check-circle text-success'} me-2`} />
                  {maintenance ? 'Đang bảo trì' : 'Hệ thống hoạt động'}
                </span>
                <Form.Check
                  type="switch"
                  checked={maintenance}
                  onChange={toggleMaintenance}
                  style={{ transform: 'scale(1.4)' }}
                />
              </div>
            </Card.Body>
          </Card>

          <AddSettingForm onAdd={(key, value) => saveSetting(key, value, null)} />
        </Col>

        <Col xl={7}>
          <Card>
            <Card.Header>Danh sách cấu hình</Card.Header>
            <Card.Body>
              {settings.length === 0 ? (
                <p className="text-muted mb-0">Chưa có cấu hình nào.</p>
              ) : (
                settings.map((s) => (
                  <SettingRow key={s.key} setting={s} saving={savingKey === s.key} onSave={saveSetting} />
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}
