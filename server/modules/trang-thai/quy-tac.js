'use strict';
// quy-tac.js: quy tac ngay o tuong lai cua trang thai hang ngay (dung chung cho API va nhap Excel).
const { ngayDuSangHienThi } = require('../../../shared/bieu-mau.js');

// loai: { ten, cho_dang_ky_truoc }. tu, den, homNay: 'yyyy-mm-dd' (den co the null).
// Tra ve null neu hop le, hoac { truong: 'tu_ngay' | 'den_ngay', thongBao } neu vi pham.
function kiemTraNgayTuongLai(db, loai, tu, den, homNay) {
  if (loai.cho_dang_ky_truoc) {
    return null;
  }
  const duocTruoc = db
    .prepare("SELECT ten FROM danh_muc WHERE loai = 'trang_thai' AND cho_dang_ky_truoc = 1 AND dang_dung = 1 ORDER BY thu_tu, id")
    .all()
    .map((d) => '"' + d.ten + '"');
  const goiY = duocTruoc.length > 0 ? ' Chỉ ' + duocTruoc.join(', ') + ' mới đăng ký trước được (đổi ở màn hình Danh mục).' : '';
  if (tu > homNay) {
    return {
      truong: 'tu_ngay',
      thongBao:
        'Trạng thái "' + loai.ten + '" không đăng ký trước được: "từ ngày" ' + ngayDuSangHienThi(tu) + ' đang ở tương lai (hôm nay là ' + ngayDuSangHienThi(homNay) + ').' + goiY,
    };
  }
  if (den && den > homNay) {
    return {
      truong: 'den_ngay',
      thongBao:
        'Trạng thái "' + loai.ten + '": "đến ngày" ' + ngayDuSangHienThi(den) + ' đang ở tương lai. Nếu vẫn đang ở trạng thái này thì để trống "đến ngày" (hiểu là chưa kết thúc).' + goiY,
    };
  }
  return null;
}

module.exports = { kiemTraNgayTuongLai };
