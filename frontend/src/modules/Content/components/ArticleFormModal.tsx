import { useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { Button, Checkbox, ImageUpload, SelectInput, TextInput, TextareaInput } from '../../../ui';
import { articleActions, type Article } from '../hooks/useContent';
import { ARTICLE_GROUP_OPTIONS, CONTENT_STATUS_OPTIONS } from '../config/contentConfig';

interface Props {
  show: boolean;
  editing: Article | null;
  onClose: () => void;
  onSaved: () => void;
}

// Modal tạo/sửa bài viết (Thủ thuật/Tin tức/Chính sách). Slug trống -> backend tự sinh.
export default function ArticleFormModal({ show, editing, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [group, setGroup] = useState('tips');
  const [category, setCategory] = useState('');
  const [categoryKey, setCategoryKey] = useState('all');
  const [author, setAuthor] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [status, setStatus] = useState('active');
  const [showOnLanding, setShowOnLanding] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleEnter() {
    setTitle(editing?.title ?? '');
    setSlug(editing?.slug ?? '');
    setGroup(editing?.group ?? 'tips');
    setCategory(editing?.category ?? '');
    setCategoryKey(editing?.category_key ?? 'all');
    setAuthor(editing?.author ?? '');
    setExcerpt(editing?.excerpt ?? '');
    setContent(editing?.content ?? '');
    setImageUrl(editing?.image_url ?? '');
    setSortOrder(editing != null ? String(editing.sort_order) : '0');
    setStatus(editing?.status ?? 'active');
    setShowOnLanding(editing?.show_on_landing ?? true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title,
        slug: slug || null,
        group,
        category: category || '',
        category_key: categoryKey || 'all',
        author: author || null,
        excerpt: excerpt || null,
        content: content || null,
        image_url: imageUrl || null,
        sort_order: parseInt(sortOrder || '0', 10),
        status,
        show_on_landing: showOnLanding,
      };
      if (editing) {
        await articleActions.update(editing.id, body);
      } else {
        await articleActions.create(body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal show={show} onHide={onClose} onEnter={handleEnter} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">{editing ? 'Cập nhật' : 'Thêm'} bài viết</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row className="g-3">
            <Col md={8}>
              <TextInput id="art-title" label="Tiêu đề" required value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
            </Col>
            <Col md={4}>
              <SelectInput id="art-group" label="Nhóm" value={group}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGroup(e.target.value)}
                options={ARTICLE_GROUP_OPTIONS} />
            </Col>
            <Col md={12}>
              <TextInput id="art-slug" label="Slug" value={slug}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlug(e.target.value)}
                help="Bỏ trống = tự sinh từ tiêu đề" />
            </Col>
            <Col md={5}>
              <TextInput id="art-cat" label="Nhãn danh mục" value={category}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)}
                help='Hiển thị trên card, vd "Thủ thuật AI"' />
            </Col>
            <Col md={4}>
              <TextInput id="art-catkey" label="Key danh mục" value={categoryKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategoryKey(e.target.value)}
                help="Key lọc tab, vd ai/vps/domain" />
            </Col>
            <Col md={3}>
              <TextInput id="art-sort" label="Thứ tự" type="number" value={sortOrder}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSortOrder(e.target.value)} />
            </Col>
            <Col md={6}>
              <TextInput id="art-author" label="Tác giả" value={author}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthor(e.target.value)} />
            </Col>
            <Col md={6}>
              <SelectInput id="art-status" label="Trạng thái" value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                options={CONTENT_STATUS_OPTIONS} />
            </Col>
            <Col md={12}>
              <TextareaInput id="art-excerpt" label="Tóm tắt" rows={2} value={excerpt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExcerpt(e.target.value)} />
            </Col>
            <Col md={12}>
              <TextareaInput id="art-content" label="Nội dung (HTML)" rows={8} value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                help="Thân bài HTML hiển thị trên trang chi tiết" />
            </Col>
            <Col md={12}>
              <ImageUpload label="Ảnh đại diện" value={imageUrl} onChange={setImageUrl} />
            </Col>
            <Col md={12}>
              <Checkbox type="switch" id="art-landing" label="Hiển thị trên landing"
                checked={showOnLanding}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowOnLanding(e.target.checked)} />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" variant="primary" loading={saving}>Lưu</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
