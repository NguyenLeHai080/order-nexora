import { useState } from 'react';
import { Row, Col, Badge } from 'react-bootstrap';
import PageHeader from '../../../components/PageHeader';
import {
  Button,
  TextInput,
  SelectInput,
  TextareaInput,
  Checkbox,
  Loader,
  EmptyState,
  SectionCard,
} from '../../../ui';

/**
 * UI Kit Gallery — catalog trực quan toàn bộ component dùng chung.
 * Dành cho dev xem nhanh giao diện + cách dùng. Truy cập tại /ui-kit.
 */
export default function UiKitPage() {
  const [text, setText] = useState('');
  const [select, setSelect] = useState('');
  const [checked, setChecked] = useState(true);
  const [sw, setSw] = useState(false);

  return (
    <>
      <PageHeader title="UI Kit" breadcrumb="Hệ thống › UI Kit" />
      <p className="text-muted">
        Catalog các component nguyên tử trong <code>src/ui/</code>. Import gọn qua{' '}
        <code>{`import { Button } from '../../../ui'`}</code>. Chi tiết props xem{' '}
        <code>docs/ui-kit.md</code>.
      </p>

      {/* Buttons */}
      <SectionCard title="Buttons">
        <div className="ui-demo-row">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="success">Success</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="info">Info</Button>
          <Button variant="light">Light</Button>
        </div>
        <div className="ui-demo-row">
          <Button variant="primary" icon="plus-lg">
            Có icon
          </Button>
          <Button variant="primary" loading>
            Đang xử lý
          </Button>
          <Button variant="primary" size="sm">
            Nhỏ
          </Button>
          <Button variant="primary" size="lg">
            Lớn
          </Button>
          <Button variant="light" icon="trash" className="text-danger" />
        </div>
      </SectionCard>

      {/* Inputs */}
      <SectionCard title="Trường nhập liệu">
        <Row>
          <Col md={6}>
            <TextInput
              id="demo-text"
              label="Họ tên"
              required
              placeholder="Nhập họ tên"
              value={text}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
              help="Trường văn bản kèm gợi ý."
            />
          </Col>
          <Col md={6}>
            <TextInput
              id="demo-error"
              label="Email"
              type="email"
              value="sai-dinh-dang"
              onChange={() => {}}
              error="Email không hợp lệ."
            />
          </Col>
          <Col md={6}>
            <SelectInput
              id="demo-select"
              label="Trạng thái"
              placeholder="-- Chọn --"
              value={select}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelect(e.target.value)}
              options={[
                { value: 'active', label: 'Hoạt động' },
                { value: 'locked', label: 'Đã khóa' },
              ]}
            />
          </Col>
          <Col md={6}>
            <TextareaInput id="demo-textarea" label="Ghi chú" rows={3} placeholder="Nhập ghi chú..." />
          </Col>
        </Row>
        <div className="ui-demo-row">
          <Checkbox
            id="demo-check"
            label="Đồng ý điều khoản"
            checked={checked}
            onChange={() => setChecked((v) => !v)}
          />
          <Checkbox
            id="demo-switch"
            type="switch"
            label="Bật thông báo"
            checked={sw}
            onChange={() => setSw((v) => !v)}
          />
        </div>
      </SectionCard>

      {/* Badges trạng thái */}
      <SectionCard title="Badge & nhãn">
        <div className="ui-demo-row">
          <Badge bg="primary">Primary</Badge>
          <Badge bg="success">Thành công</Badge>
          <Badge bg="danger">Lỗi</Badge>
          <Badge bg="warning">Chờ</Badge>
          <Badge bg="primary-subtle" className="text-primary">
            Soft
          </Badge>
        </div>
      </SectionCard>

      {/* Loader + EmptyState */}
      <Row>
        <Col md={6}>
          <SectionCard title="Loader">
            <Loader label="Đang tải dữ liệu..." />
          </SectionCard>
        </Col>
        <Col md={6}>
          <SectionCard title="Empty State">
            <EmptyState
              icon="inbox"
              title="Chưa có dữ liệu"
              description="Danh sách trống. Hãy thêm mục mới."
              action={
                <Button variant="primary" icon="plus-lg" size="sm">
                  Thêm mới
                </Button>
              }
            />
          </SectionCard>
        </Col>
      </Row>
    </>
  );
}
