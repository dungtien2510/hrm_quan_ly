'use strict';
// trang-thai-ngay.js: tra cuu trang thai cua quan nhan theo NGAY.
// Trang thai luu theo khoang (tu_ngay den den_ngay, den_ngay trong = chua ket thuc). Ngay khong nam trong
// khoang nao thi coi la "Co mat" (khong ghi cung con so; ten va co tinh_la_vang lay tu danh_muc).
const { ngayDuongLich } = require('../../../shared/ngay-chuoi.js');

const MA_MAC_DINH = 'co_mat';

function macDinh(db) {
  const dm = db.prepare("SELECT id, ma, ten, mau, tinh_la_vang FROM danh_muc WHERE loai = 'trang_thai' AND ma = ?").get(MA_MAC_DINH);
  return {
    trang_thai_id: dm ? dm.id : null,
    ma: MA_MAC_DINH,
    ten: dm ? dm.ten : 'Có mặt',
    mau: dm ? dm.mau : null,
    tinh_la_vang: dm ? dm.tinh_la_vang : 0,
    tu_ngay: null,
    den_ngay: null,
    ly_do_hoac_noi: null,
    macDinh: true,
  };
}

const CAU_CHON = `SELECT t.id AS dong_id, t.quan_nhan_id, t.trang_thai_id, d.ma, d.ten, d.mau, d.tinh_la_vang, t.tu_ngay, t.den_ngay, t.ly_do_hoac_noi
                    FROM trang_thai_quan_nhan t JOIN danh_muc d ON d.id = t.trang_thai_id`;

// Trang thai cua mot nguoi vao mot ngay ('yyyy-mm-dd', mac dinh hom nay theo gio dia phuong).
function trangThaiNgay(db, quanNhanId, ngay = ngayDuongLich()) {
  const dong = db
    .prepare(CAU_CHON + " WHERE t.quan_nhan_id = ? AND t.tu_ngay <= ? AND COALESCE(t.den_ngay, '9999-12-31') >= ? ORDER BY t.tu_ngay DESC LIMIT 1")
    .get(quanNhanId, ngay, ngay);
  return dong ? Object.assign({}, dong, { macDinh: false }) : macDinh(db);
}

// Trang thai cua nhieu nguoi cung mot ngay: { quanNhanId: trangThai }.
function trangThaiNhieuNguoi(db, dsId, ngay = ngayDuongLich()) {
  const ketQua = {};
  if (dsId.length === 0) {
    return ketQua;
  }
  const dongChoMacDinh = macDinh(db);
  for (const id of dsId) {
    ketQua[id] = dongChoMacDinh;
  }
  const cacDong = db
    .prepare(CAU_CHON + ` WHERE t.quan_nhan_id IN (${dsId.map(() => '?').join(', ')}) AND t.tu_ngay <= ? AND COALESCE(t.den_ngay, '9999-12-31') >= ? ORDER BY t.tu_ngay`)
    .all(...dsId, ngay, ngay);
  for (const d of cacDong) {
    ketQua[d.quan_nhan_id] = Object.assign({}, d, { macDinh: false });
  }
  return ketQua;
}

// Tim khoang trang thai khac cua cung nguoi bi CHONG voi [tu, den] (den = null: chua ket thuc).
function timKhoangChong(db, quanNhanId, tu, den, boQuaDongId = null) {
  return (
    db
      .prepare(
        CAU_CHON +
          ` WHERE t.quan_nhan_id = ? AND t.id IS NOT ? AND t.tu_ngay <= COALESCE(?, '9999-12-31') AND ? <= COALESCE(t.den_ngay, '9999-12-31')
            ORDER BY t.tu_ngay LIMIT 1`
      )
      .get(quanNhanId, boQuaDongId, den, tu) || null
  );
}

module.exports = { MA_MAC_DINH, trangThaiNgay, trangThaiNhieuNguoi, timKhoangChong };
