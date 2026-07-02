import { useState } from 'react';
import { Alert, Card, Col, Nav, Row } from 'react-bootstrap';
import PageHeader from '../../../components/PageHeader';
import { Loader } from '../../../ui';
import { useSettings } from '../hooks/useSettings';
import { SETTING_TABS } from '../config/settingConfig';
import GeneralPanel from '../components/GeneralPanel';
import SalesPanel from '../components/SalesPanel';
import NotificationsPanel from '../components/NotificationsPanel';
import AdvancedPanel from '../components/AdvancedPanel';

type TabKey = (typeof SETTING_TABS)[number]['key'];

// Trang cài đặt: tab dọc theo nhóm (Chung / Guest & Bán hàng / Thông báo / Nâng cao).
export default function SettingPage() {
  const { settings, maintenance, loading, savingKey, toast, notify, toggleMaintenance, saveSetting } = useSettings();
  const [tab, setTab] = useState<TabKey>('general');

  if (loading) {
    return <div className="text-center py-5"><Loader /></div>;
  }

  return (
    <>
      <PageHeader title="Cài đặt hệ thống" breadcrumb="Hệ thống › Cài đặt" />

      {toast && <Alert variant={toast.type}>{toast.msg}</Alert>}

      <Row className="g-3">
        <Col md={3}>
          <Card>
            <Card.Body className="p-2">
              <Nav variant="pills" className="flex-column" activeKey={tab} onSelect={(k) => setTab(k as TabKey)}>
                {SETTING_TABS.map((t) => (
                  <Nav.Item key={t.key}>
                    <Nav.Link eventKey={t.key}>
                      <i className={`bi ${t.icon} me-2`} />
                      {t.label}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
            </Card.Body>
          </Card>
        </Col>

        <Col md={9}>
          {tab === 'general' && (
            <GeneralPanel
              settings={settings}
              savingKey={savingKey}
              onSave={saveSetting}
              maintenance={maintenance}
              onToggleMaintenance={toggleMaintenance}
            />
          )}
          {tab === 'sales' && (
            <SalesPanel settings={settings} savingKey={savingKey} onSave={saveSetting} />
          )}
          {tab === 'notifications' && (
            <NotificationsPanel settings={settings} savingKey={savingKey} onSave={saveSetting} onNotify={notify} />
          )}
          {tab === 'advanced' && (
            <AdvancedPanel settings={settings} savingKey={savingKey} onSave={saveSetting} />
          )}
        </Col>
      </Row>
    </>
  );
}
