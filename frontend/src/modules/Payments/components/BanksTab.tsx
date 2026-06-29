import { useAuthStore } from '../../../core/authStore';
import DataTable, { type Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Button } from '../../../ui';
import { useBanks, paymentActions, type Bank } from '../hooks/usePayments';
import { useBankStore } from '../store/paymentStore';
import BankFormModal from './BankFormModal';

// Tab quản lý tài khoản ngân hàng nhận tiền.
export default function BanksTab() {
  const { can } = useAuthStore();
  const { banks, loading, reload } = useBanks();
  const store = useBankStore();

  const columns: Column<Bank>[] = [
    { key: 'bank_name', header: 'Ngân hàng', render: (b) => <span className="fw-semibold">{b.bank_name}</span> },
    { key: 'account_number', header: 'Số tài khoản', render: (b) => <span className="font-monospace">{b.account_number}</span> },
    { key: 'account_holder', header: 'Chủ tài khoản' },
    { key: 'qr', header: 'QR', render: (b) => (b.qr_image_url ? <i className="bi bi-qr-code fs-5 text-primary" /> : '-') },
    { key: 'status', header: 'Trạng thái', render: (b) => <StatusBadge status={b.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (b) => (
        <div className="d-flex gap-1 justify-content-end">
          {can('update', 'Payment') && (
            <Button size="sm" variant="light" icon="pencil" onClick={() => store.openEdit(b)} />
          )}
          {can('destroy', 'Payment') && (
            <Button size="sm" variant="light" icon="trash" className="text-danger" onClick={() => store.askDelete(b)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={banks}
        loading={loading}
        toolbar={
          <div className="d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Tài khoản nhận tiền</span>
            {can('create', 'Payment') && (
              <Button size="sm" variant="primary" icon="plus-lg" onClick={() => store.openCreate()}>
                Thêm ngân hàng
              </Button>
            )}
          </div>
        }
      />
      <BankFormModal show={store.showForm} editing={store.editing} onClose={store.closeForm} onSaved={reload} />
      <ConfirmDialog
        show={!!store.deleting}
        message={`Xóa tài khoản "${store.deleting?.bank_name}"?`}
        confirmLabel="Xóa"
        onConfirm={async () => { if (store.deleting) await paymentActions.removeBank(store.deleting.id); reload(); }}
        onClose={store.cancelDelete}
      />
    </>
  );
}
