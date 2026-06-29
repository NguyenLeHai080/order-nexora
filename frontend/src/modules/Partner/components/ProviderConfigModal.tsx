import { useState } from 'react';
import { Alert, Badge, Col, Form, InputGroup, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { Button } from '../../../ui';
import {
  buildSupplierPayload,
  capabilityLabel,
  integrationActions,
  type DriverDescriptor,
  type IntegrationSupplier,
  type WebhookConfig,
} from '../hooks/useIntegrations';

interface Props {
  show: boolean;
  driver: DriverDescriptor | null;
  editing: IntegrationSupplier | null;
  onClose: () => void;
  onSaved: () => void;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="light"
      icon={copied ? 'check2' : 'clipboard'}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
    >
      {copied ? 'Đã copy' : 'Copy'}
    </Button>
  );
}

/**
 * Modal cấu hình nhà cung cấp — render field động theo descriptor.fields.
 * Field secret để trống nghĩa là giữ nguyên giá trị cũ (backend không trả secret).
 * Phần webhook chỉ hiện khi driver.has_webhook.
 */
export default function ProviderConfigModal({ show, driver, editing, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState('test');
  const [status, setStatus] = useState('active');
  const [note, setNote] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [webhook, setWebhook] = useState<WebhookConfig | null>(null);
  const [secretMsg, setSecretMsg] = useState<string | null>(null);
  const [generating, setGenerating] = useState<'test' | 'live' | null>(null);

  function handleEnter() {
    if (!driver) return;
    setName(editing?.name ?? driver.label);
    setEnvironment(editing?.environment ?? 'test');
    setStatus(editing?.status ?? 'active');
    setNote(editing?.note ?? '');
    // Preset endpoint từ giá trị cũ hoặc default; secret luôn để trống.
    const next: Record<string, string> = {};
    for (const field of driver.fields) {
      if (field.key === 'api_endpoint') {
        next[field.key] = editing?.api_endpoint ?? driver.default_endpoint ?? '';
      } else {
        next[field.key] = '';
      }
    }
    setValues(next);
    setError(null);
    setSecretMsg(null);
    setWebhook(null);

    if (driver.has_webhook) {
      integrationActions
        .getWebhookConfig(driver.key)
        .then((r) => setWebhook(r.data.data ?? null))
        .catch(() => setWebhook(null));
    }
  }

  function patchValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!driver) return;
    setSaving(true);
    setError(null);
    try {
      const payload = buildSupplierPayload(driver, { name, environment, status, note }, values);
      if (editing) await integrationActions.updateSupplier(editing.id, payload);
      else await integrationActions.createSupplier(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateSecret(env: 'test' | 'live') {
    if (!driver) return;
    setGenerating(env);
    setSecretMsg(null);
    try {
      const res = await integrationActions.generateSecret(driver.key, env);
      const secret = res.data.data?.webhook_secret ?? '';
      setSecretMsg(`Secret ${env} mới: ${secret} — copy ngay, sẽ không hiện lại.`);
      const r = await integrationActions.getWebhookConfig(driver.key);
      setWebhook(r.data.data ?? null);
      onSaved();
    } catch (err) {
      setSecretMsg(extractError(err));
    } finally {
      setGenerating(null);
    }
  }

  function renderField(field: DriverDescriptor['fields'][number]) {
    const configured = editing?.configured?.[field.key];
    const help = field.secret && configured ? 'Đã lưu — để trống nếu không đổi' : undefined;

    if (field.type === 'select' && field.options) {
      return (
        <Form.Select value={values[field.key] ?? ''} onChange={(e) => patchValue(field.key, e.target.value)}>
          <option value="">-- chọn --</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Form.Select>
      );
    }

    return (
      <>
        <Form.Control
          type={field.type === 'password' ? 'password' : 'text'}
          value={values[field.key] ?? ''}
          placeholder={field.placeholder ?? ''}
          required={field.required && !configured}
          onChange={(e) => patchValue(field.key, e.target.value)}
        />
        {help && <Form.Text muted>{help}</Form.Text>}
      </>
    );
  }

  if (!driver) return null;

  return (
    <Modal show={show} onHide={onClose} onEnter={handleEnter} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">
            {editing ? 'Cấu hình' : 'Kết nối'} {driver.label}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <div className="d-flex flex-wrap gap-1 mb-3">
            {driver.capabilities.map((cap) => (
              <Badge key={cap} bg="light" text="dark" className="border">
                {capabilityLabel(cap)}
              </Badge>
            ))}
          </div>

          <Row className="g-3">
            <Col md={driver.supports_environments ? 6 : 8}>
              <Form.Label>Tên hiển thị</Form.Label>
              <Form.Control value={name} onChange={(e) => setName(e.target.value)} required />
            </Col>
            {driver.supports_environments && (
              <Col md={3}>
                <Form.Label>Môi trường</Form.Label>
                <Form.Select value={environment} onChange={(e) => setEnvironment(e.target.value)}>
                  <option value="test">test</option>
                  <option value="live">live</option>
                </Form.Select>
              </Col>
            )}
            <Col md={driver.supports_environments ? 3 : 4}>
              <Form.Label>Trạng thái</Form.Label>
              <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </Form.Select>
            </Col>

            {driver.fields.map((field) => (
              <Col md={field.type === 'url' ? 12 : 6} key={field.key}>
                <Form.Label>
                  {field.label}
                  {field.secret && <i className="bi bi-shield-lock ms-1 text-muted" title="Bí mật" />}
                </Form.Label>
                {renderField(field)}
              </Col>
            ))}

            <Col md={12}>
              <Form.Label>Ghi chú</Form.Label>
              <Form.Control as="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Col>
          </Row>

          {driver.has_webhook && (
            <div className="mt-4 pt-3 border-top">
              <h6 className="fw-semibold mb-2">
                <i className="bi bi-broadcast-pin me-1" /> Webhook
              </h6>
              {webhook ? (
                <>
                  <Form.Label className="small text-muted">URL cố định gửi cho nhà cung cấp</Form.Label>
                  <InputGroup className="mb-2">
                    <Form.Control readOnly value={webhook.webhook_url} />
                    <CopyButton value={webhook.webhook_url} />
                  </InputGroup>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <Button
                      type="button"
                      variant="light"
                      icon="key"
                      loading={generating === 'test'}
                      onClick={() => void handleGenerateSecret('test')}
                    >
                      Tạo secret test
                    </Button>
                    <Button
                      type="button"
                      variant="light"
                      icon="key"
                      loading={generating === 'live'}
                      onClick={() => void handleGenerateSecret('live')}
                    >
                      Tạo secret live
                    </Button>
                    <Badge bg={webhook.has_webhook_secret_test ? 'success' : 'secondary'}>
                      test {webhook.has_webhook_secret_test ? 'đã có' : 'chưa'}
                    </Badge>
                    <Badge bg={webhook.has_webhook_secret_live ? 'success' : 'secondary'}>
                      live {webhook.has_webhook_secret_live ? 'đã có' : 'chưa'}
                    </Badge>
                  </div>
                  {secretMsg && <Alert variant="info" className="mt-2 mb-0 small">{secretMsg}</Alert>}
                </>
              ) : (
                <p className="text-muted small mb-0">Lưu cấu hình trước để lấy URL webhook và tạo secret.</p>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" icon="save" loading={saving}>
            Lưu cấu hình
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
