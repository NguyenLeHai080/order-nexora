import StatusBadge from '../../../components/StatusBadge';
import type { OrgTreeNode } from '../hooks/useOrganizations';

// Một node trong cây tổ chức (đệ quy).
function TreeItem({ node, level }: { node: OrgTreeNode; level: number }) {
  return (
    <li>
      <div className="d-flex align-items-center gap-2 py-1" style={{ paddingLeft: level * 24 }}>
        <i className={`bi ${node.children.length > 0 ? 'bi-folder-fill text-warning' : 'bi-file-earmark text-muted'}`} />
        <span className="fw-medium">{node.name}</span>
        <small className="text-muted">/{node.slug}</small>
        <StatusBadge status={node.status} />
      </div>
      {node.children.length > 0 && (
        <ul className="list-unstyled mb-0">
          {node.children.map((c) => <TreeItem key={c.id} node={c} level={level + 1} />)}
        </ul>
      )}
    </li>
  );
}

// Hiển thị cây tổ chức dạng phân cấp.
export default function OrgTree({ tree }: { tree: OrgTreeNode[] }) {
  if (tree.length === 0) return <p className="text-muted mb-0">Chưa có dữ liệu.</p>;
  return (
    <ul className="list-unstyled mb-0">
      {tree.map((n) => <TreeItem key={n.id} node={n} level={0} />)}
    </ul>
  );
}
