/**
 * Registry nội dung "giới thiệu chức năng" hiển thị khi bấm icon ⓘ ở mỗi trang.
 *
 * Mỗi key mô tả một chức năng trong LUỒNG TỰ ĐỘNG chuẩn của hệ thống:
 *   Tích hợp API → Xác nhận NCC → Tồn kho (3 giá) → Sản phẩm (%lãi, hóa đơn)
 *   → Mã giảm giá → Bảo hành.
 * Dùng chung bởi FeatureInfoModal; PageHeader chỉ cần truyền `infoKey`.
 */

export interface FeatureInfoSection {
  heading: string;
  body: string;
}

export interface FeatureInfo {
  title: string;
  /** Vị trí trong luồng tự động (vd "Bước 3/6"). */
  flowStep?: string;
  intro: string;
  sections: FeatureInfoSection[];
}

export const FEATURE_INFO: Record<string, FeatureInfo> = {
  integrations: {
    title: 'NCC & Tích hợp API',
    flowStep: 'Bước 1/6 — Tích hợp API',
    intro:
      'Kết nối tới nhà cung cấp (VD Store) bằng API key. Đây là điểm bắt đầu của luồng tự động: từ đây hệ thống kéo catalog, đẩy đơn và nhận webhook cập nhật trạng thái.',
    sections: [
      {
        heading: 'Việc cần làm',
        body: 'Nhập API key (test/live) và webhook secret cho từng nhà cung cấp, rồi kiểm tra số dư ví CTV để xác nhận kết nối hoạt động.',
      },
      {
        heading: 'Sau khi cấu hình',
        body: 'Bấm "Đồng bộ NCC" ở trang Sản phẩm để kéo catalog về. Webhook sẽ tự cập nhật trạng thái đơn và lưu voucher thưởng (nếu có).',
      },
    ],
  },
  suppliers: {
    title: 'Nhà cung cấp kho',
    flowStep: 'Bước 2/6 — Xác nhận NCC',
    intro:
      'Quản lý hồ sơ nhà cung cấp: tên, driver, môi trường (test/live) và trạng thái. Mỗi sản phẩm và phiếu nhập kho đều gắn với một nhà cung cấp.',
    sections: [
      {
        heading: 'Vai trò trong luồng',
        body: 'Nhà cung cấp là nguồn của "giá vốn" (giá CTV). Lợi nhuận mỗi sản phẩm = giá niêm yết − giá vốn NCC.',
      },
    ],
  },
  products: {
    title: 'Sản phẩm & Kho',
    flowStep: 'Bước 3-4/6 — Tồn kho (3 giá) → Sản phẩm',
    intro:
      'Nhà cung cấp trả 3 giá cho mỗi sản phẩm: giá CTV (giá vốn), giá niêm yết và % chiết khấu CTV. Giá bán mặc định = giá niêm yết; lợi nhuận/đơn = giá bán − giá vốn.',
    sections: [
      {
        heading: '3 giá nghĩa là gì',
        body: 'Giá nhập NCC = số phải trả lại nhà cung cấp. Giá niêm yết = giá bán cho khách. Markup % là phần cộng thêm tùy chọn trên giá niêm yết (mặc định 0).',
      },
      {
        heading: 'Tính lãi tự động',
        body: 'Sau khi đồng bộ, mỗi sản phẩm có ngay lợi nhuận = giá niêm yết − giá vốn. Dùng nút "Tính giá bán" để chỉnh markup hoặc nhập thẳng giá bán mong muốn.',
      },
      {
        heading: 'Khi khách thanh toán',
        body: 'Tiền được tách: phần giá vốn trả về nhà cung cấp, phần lãi còn lại cộng vào ví chủ shop. Đơn cần xử lý tay sẽ cho khách quét Zalo gặp nhân viên.',
      },
    ],
  },
  categories: {
    title: 'Danh mục sản phẩm',
    flowStep: 'Hỗ trợ — phân loại sản phẩm',
    intro:
      'Nhóm sản phẩm theo danh mục để lọc và quản lý. Khi đồng bộ catalog, tên danh mục bên NCC được tự tạo thành danh mục nội bộ và gắn vào sản phẩm.',
    sections: [
      {
        heading: 'Tự động liên kết',
        body: 'Đồng bộ NCC sẽ get-or-create danh mục theo tên rồi gán vào sản phẩm. Bạn vẫn có thể tạo/sửa danh mục riêng cho sản phẩm thủ công.',
      },
    ],
  },
  inventory: {
    title: 'Tồn kho (sổ kho)',
    flowStep: 'Bước 3/6 — Tồn kho',
    intro:
      'Sổ kho ghi mọi biến động: nhập (tăng tồn, ghi giá vốn) và bán (giảm tồn, ghi giá bán). Tồn hiện tại = tồn ban đầu − đã bán.',
    sections: [
      {
        heading: 'Kho - Tài chính - Bán hàng',
        body: 'Mỗi lần nhập/bán đều sinh một dòng sổ kho kèm dòng tiền (cash_in/cash_out), nối kho với tài chính. Đây là nguồn số liệu cho lợi nhuận.',
      },
    ],
  },
  vouchers: {
    title: 'Mã giảm giá',
    flowStep: 'Bước 5/6 — Mã giảm giá',
    intro:
      'Tạo mã giảm giá theo số tiền hoặc phần trăm, đặt thời hạn và giới hạn lượt dùng. Gõ mô tả là hệ thống gợi ý mã tự động.',
    sections: [
      {
        heading: 'Tự sinh mã',
        body: 'Để trống ô mã -> hệ thống sinh mã duy nhất từ mô tả (hoặc ngẫu nhiên). Bạn vẫn có thể tự nhập mã riêng.',
      },
      {
        heading: 'Ảnh hưởng lợi nhuận',
        body: 'Voucher giảm tổng tiền khách trả nhưng giá vốn không đổi, nên phần lãi của chủ shop co lại đúng bằng số tiền đã giảm.',
      },
    ],
  },
  warranties: {
    title: 'Bảo hành',
    flowStep: 'Bước 6/6 — Bảo hành',
    intro:
      'Phiếu bảo hành tạo tự động khi bán sản phẩm có thời hạn bảo hành. Thời hạn tính từ ngày lập hóa đơn cộng số ngày nhà cung cấp quy định.',
    sections: [
      {
        heading: 'Còn bao nhiêu ngày',
        body: 'Cột "Còn lại" hiển thị "Còn X ngày" hoặc "Hết hạn" dựa trên ngày kết thúc so với hiện tại. Phiếu hết hạn không ghi nhận bảo hành được.',
      },
    ],
  },
  orders: {
    title: 'Đơn hàng',
    intro:
      'Theo dõi đơn của khách: trạng thái, nội dung giao và dòng tiền. Đơn cần admin xử lý tay sẽ hiển thị hướng dẫn quét Zalo gặp nhân viên sau khi khách thanh toán.',
    sections: [
      {
        heading: 'Tách tiền khi thanh toán',
        body: 'Khi khách trả tiền: giá vốn về nhà cung cấp, phần lãi về ví chủ shop. Số liệu này hiển thị ở trang Lợi nhuận.',
      },
    ],
  },
  profit: {
    title: 'Lợi nhuận',
    intro:
      'Hai góc nhìn tách biệt: (1) Lãi bán hàng theo đơn — doanh thu, giá vốn, lãi về ví chủ (cộng dồn snapshot lúc bán); (2) Dòng tiền kho hàng — tiền mặt thực thu/chi trong sổ kho, gồm cả tiền nhập hàng tồn chưa bán.',
    sections: [
      {
        heading: 'Lãi bán hàng (dồn tích)',
        body: 'Lãi chủ shop = tiền khách trả − giá vốn − giảm giá (voucher). Voucher làm lãi co lại, giá vốn trả NCC luôn giữ nguyên. Chỉ tính đơn đã bán thành công.',
      },
      {
        heading: 'Dòng tiền kho (tiền mặt)',
        body: 'Dòng tiền ròng = tổng thu − tổng chi của sổ kho. Tiền nhập hàng (CHI khi nhập kho) bị trừ ngay dù hàng chưa bán, nên dòng tiền ròng có thể âm khi vừa nhập nhiều hàng — vốn đang đọng trong kho.',
      },
    ],
  },
};
