/**
 * Danh sách ngân hàng Việt Nam (mã + tên) dùng cho select khi tạo tài khoản nhận tiền.
 * Mã theo chuẩn napas/VietQR để sau này dựng QR tự động.
 */
export interface BankInfo {
  code: string;
  shortName: string;
  fullName: string;
}

export const VN_BANKS: BankInfo[] = [
  { code: 'VCB', shortName: 'Vietcombank', fullName: 'NH TMCP Ngoại thương Việt Nam' },
  { code: 'TCB', shortName: 'Techcombank', fullName: 'NH TMCP Kỹ thương Việt Nam' },
  { code: 'BIDV', shortName: 'BIDV', fullName: 'NH Đầu tư & Phát triển Việt Nam' },
  { code: 'VTB', shortName: 'VietinBank', fullName: 'NH TMCP Công thương Việt Nam' },
  { code: 'MB', shortName: 'MB Bank', fullName: 'NH TMCP Quân đội' },
  { code: 'ACB', shortName: 'ACB', fullName: 'NH TMCP Á Châu' },
  { code: 'VPB', shortName: 'VPBank', fullName: 'NH TMCP Việt Nam Thịnh Vượng' },
  { code: 'TPB', shortName: 'TPBank', fullName: 'NH TMCP Tiên Phong' },
  { code: 'STB', shortName: 'Sacombank', fullName: 'NH TMCP Sài Gòn Thương Tín' },
  { code: 'HDB', shortName: 'HDBank', fullName: 'NH TMCP Phát triển TP.HCM' },
  { code: 'VIB', shortName: 'VIB', fullName: 'NH TMCP Quốc tế Việt Nam' },
  { code: 'SHB', shortName: 'SHB', fullName: 'NH TMCP Sài Gòn - Hà Nội' },
  { code: 'OCB', shortName: 'OCB', fullName: 'NH TMCP Phương Đông' },
  { code: 'MSB', shortName: 'MSB', fullName: 'NH TMCP Hàng Hải' },
  { code: 'EIB', shortName: 'Eximbank', fullName: 'NH TMCP Xuất nhập khẩu Việt Nam' },
  { code: 'SCB', shortName: 'SCB', fullName: 'NH TMCP Sài Gòn' },
  { code: 'AGRI', shortName: 'Agribank', fullName: 'NH NN & PT Nông thôn Việt Nam' },
  { code: 'NAB', shortName: 'Nam A Bank', fullName: 'NH TMCP Nam Á' },
  { code: 'SEAB', shortName: 'SeABank', fullName: 'NH TMCP Đông Nam Á' },
  { code: 'LPB', shortName: 'LPBank', fullName: 'NH TMCP Lộc Phát Việt Nam' },
];
