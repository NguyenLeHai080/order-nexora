import { createListStore } from '../../../core/createListStore';
import type { Org } from '../hooks/useOrganizations';

/** Store UI cục bộ module Organizations (modal thêm/sửa, xác nhận xóa). */
export const useOrganizationStore = createListStore<Org>();
