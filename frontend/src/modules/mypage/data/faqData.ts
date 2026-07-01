/**
 * Dữ liệu FAQ — mock theo phong cách ufotech.vn (danh sách Q&A 1 cột, accordion).
 * Khi nối API/CMS thật: thay FAQS bằng dữ liệu động.
 */

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

export const FAQS: FaqItem[] = [
  {
    id: 1,
    question: 'NexoraTech cung cấp những dịch vụ số nào?',
    answer: 'Chúng tôi cung cấp tài khoản AI bản quyền (ChatGPT, Claude, Gemini, Midjourney…), dịch vụ đăng ký tên miền (.com, .vn) và thuê VPS/Hosting hiệu năng cao — tất cả trên một nền tảng.',
  },
  {
    id: 2,
    question: 'Sau khi thanh toán, bao lâu tôi nhận được tài khoản?',
    answer: 'Với các sản phẩm giao tự động, bạn nhận được thông tin tài khoản ngay sau khi thanh toán thành công. Một số dịch vụ cần cấp phát thủ công sẽ được nhân viên bàn giao trong thời gian sớm nhất.',
  },
  {
    id: 3,
    question: 'Tôi thanh toán bằng cách nào?',
    answer: 'NexoraTech sử dụng ví trả trước. Bạn nạp ví một lần qua VietQR và dùng số dư để mua nhanh các dịch vụ mà không phải nhập lại thông tin thanh toán mỗi lần.',
  },
  {
    id: 4,
    question: 'Sản phẩm có được bảo hành không?',
    answer: 'Có. Mỗi sản phẩm có thời gian bảo hành rõ ràng. Trong thời gian bảo hành, nếu tài khoản gặp sự cố do nhà cung cấp, chúng tôi hỗ trợ đổi mới (1 đổi 1) theo chính sách.',
  },
  {
    id: 5,
    question: 'Tài khoản AI là chính chủ hay dùng chung?',
    answer: 'Tùy từng gói. Thông tin loại tài khoản (chính chủ/chia sẻ) được mô tả rõ trong chi tiết từng sản phẩm để bạn lựa chọn phù hợp nhu cầu.',
  },
  {
    id: 6,
    question: 'Tôi có thể yêu cầu hoàn tiền không?',
    answer: 'Bạn có thể yêu cầu hoàn tiền theo chính sách hoàn tiền của chúng tôi khi sản phẩm không thể bàn giao hoặc không đúng mô tả. Vui lòng liên hệ hỗ trợ để được xử lý nhanh.',
  },
  {
    id: 7,
    question: 'Đăng ký tên miền và VPS mất bao lâu?',
    answer: 'Tên miền thường được khởi tạo trong vài phút đến vài giờ tùy loại. VPS được cấp phát nhanh sau khi xác nhận đơn. Đội ngũ kỹ thuật sẽ hỗ trợ bạn cấu hình ban đầu nếu cần.',
  },
  {
    id: 8,
    question: 'NexoraTech hỗ trợ kỹ thuật vào thời gian nào?',
    answer: 'Chúng tôi hỗ trợ trực tuyến 24/7 qua Zalo, hệ thống ticket và hotline. Bạn có thể liên hệ bất cứ lúc nào khi cần trợ giúp.',
  },
  {
    id: 9,
    question: 'Làm sao để theo dõi đơn hàng đã mua?',
    answer: 'Sau khi đăng nhập, bạn vào mục “Đơn hàng của tôi” để xem trạng thái đơn, nội dung đã bàn giao và thông tin bảo hành của từng sản phẩm.',
  },
];
