'use strict';
// nhat-ky.js: ghi nhat ky thao tac (bang nhat_ky chi ghi them, da co trigger chan sua/xoa).
// Quy tac 3 va 4: moi lan dang nhap/xem/sua/xuat/doi quyen deu ghi; KHONG ghi mat khau, ma phien,
// so can cuoc dang chu ro. Ham lamSach che cac khoa nhay cam truoc khi ghi.
const KHOA_NHAY_CAM = /(mat_?khau|matkhau|password|token|phien|cookie|can_cuoc|cancuoc|bhxh|bhyt|secret)/i;

function lamSach(giaTri, doSau = 0) {
  if (doSau > 5) {
    return '[qua-sau]';
  }
  if (Array.isArray(giaTri)) {
    return giaTri.map((phanTu) => lamSach(phanTu, doSau + 1));
  }
  if (giaTri && typeof giaTri === 'object') {
    const ketQua = {};
    for (const [khoa, v] of Object.entries(giaTri)) {
      ketQua[khoa] = KHOA_NHAY_CAM.test(khoa) ? '[da-che]' : lamSach(v, doSau + 1);
    }
    return ketQua;
  }
  return giaTri;
}

// Ghi mot dong nhat ky. thamSo: { taiKhoanId, tenDangNhap, hanhDong, doiTuong, doiTuongId, chiTiet, may }
function ghiNhatKy(db, thamSo) {
  const { taiKhoanId = null, tenDangNhap = null, hanhDong, doiTuong = null, doiTuongId = null, chiTiet = null, may = null } = thamSo;
  if (!hanhDong) {
    throw new Error('ghiNhatKy can "hanhDong"');
  }
  db.prepare(
    'INSERT INTO nhat_ky (tai_khoan_id, ten_dang_nhap, hanh_dong, doi_tuong, doi_tuong_id, chi_tiet, may) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    taiKhoanId,
    tenDangNhap,
    hanhDong,
    doiTuong,
    doiTuongId === null || doiTuongId === undefined ? null : String(doiTuongId),
    chiTiet === null ? null : JSON.stringify(lamSach(chiTiet)),
    may
  );
}

module.exports = { ghiNhatKy, lamSach };
