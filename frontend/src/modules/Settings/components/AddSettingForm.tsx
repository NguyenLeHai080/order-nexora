import { useState } from 'react';
import { Card, Form } from 'react-bootstrap';
import { Button, TextInput } from '../../../ui';

interface Props {
  onAdd: (key: string, value: string) => Promise<void> | void;
}

// Form thêm cấu hình mới (key/value). Reset sau khi thêm thành công.
export default function AddSettingForm({ onAdd }: Props) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey) return;
    await onAdd(newKey, newValue);
    setNewKey('');
    setNewValue('');
  }

  return (
    <Card>
      <Card.Header>Thêm cấu hình mới</Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <TextInput id="set-key" label="Key" required placeholder="vd: site_name" value={newKey}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewKey(e.target.value)} />
          <TextInput id="set-value" label="Giá trị" value={newValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewValue(e.target.value)} />
          <Button type="submit" variant="primary" icon="plus-lg" className="mt-2">Thêm</Button>
        </Form>
      </Card.Body>
    </Card>
  );
}
