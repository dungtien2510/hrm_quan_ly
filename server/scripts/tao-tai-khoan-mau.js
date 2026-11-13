'use strict';
// tao-tai-khoan-mau.js: tao tai khoan THU de kiem tra phan quyen (chi dung khi phat trien, voi du lieu gia).
//   thu_admin (neu chua co admin), thu_xem_day_du, thu_xem_mot_so  - mat khau ngau nhien, in ra MOT LAN.
// Chay:  node server/scripts/tao-tai-khoan-mau.js          tao cac tai khoan thu
//        node server/scripts/tao-tai-khoan-mau.js --xoa    xoa cac tai khoan thu_*
const crypto = require('crypto');
const path = require('path');
const { docEnv, layCauHinh } = require('../loi/doc-env');
const { napMoDun } = require('../loi/nap-mo-dun');
const { moCsdl, chayMigrations, nguonMigration } = require('../loi/csdl');
const { taoSoDangKy } = require('../loi/quyen');
const { ghiNhatKy } = require('../loi/nhat-ky');
const { taoTaiKhoan } = require('../modules/tai-khoan/dich-vu');

function matKhauNgauNhien() {
  // Du dai, co chu hoa, chu thuong va so; khong dung ky tu de nham (0, O, l, 1).
  const kyTu = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let ketQua = '';
  for (const byte of crypto.randomBytes(14)) {
    ketQua += kyTu[byte % kyTu.length];
  }
  return ketQua + 'a9';
}

async function main() {
  const xoa = process.argv.includes('--xoa');
  const goc = path.resolve(__dirname, '..', '..');
  docEnv(path.join(goc, '.env'));
  const cauHinh = layCauHinh(goc);
  const { dsMoDun } = napMoDun(path.join(goc, 'server', 'modules'));
  const db = moCsdl(cauHinh.duongDanDb);
  try {
    chayMigrations(db, nguonMigration(dsMoDun));
    if (xoa) {
      const so = db.prepare("DELETE FROM nguoi_dung WHERE ten_dang_nhap LIKE 'thu\\_%' ESCAPE '\\'").run().changes;
      console.log('Da xoa ' + so + ' tai khoan thu.');
      return;
    }
    const soDangKy = taoSoDangKy(dsMoDun);
    const cacTaiKhoan = [['thu_xem_day_du', 'xem_day_du', 'Thử xem đầy đủ'], ['thu_xem_mot_so', 'xem_mot_so_muc', 'Thử xem một số mục']];
    if (db.prepare("SELECT COUNT(*) AS n FROM nguoi_dung WHERE loai = 'admin'").get().n === 0) {
      cacTaiKhoan.unshift(['thu_admin', 'admin', 'Thử admin']);
    }
    console.log('Tai khoan thu (mat khau chi in MOT LAN, luu lai ngay; lan dau dang nhap se bi bat doi mat khau, tru admin):');
    for (const [ten, loai, hoTen] of cacTaiKhoan) {
      if (db.prepare('SELECT 1 FROM nguoi_dung WHERE ten_dang_nhap = ?').get(ten)) {
        console.log('  ' + ten + ': da co, bo qua');
        continue;
      }
      const matKhau = matKhauNgauNhien();
      const id = await taoTaiKhoan(db, soDangKy, { tenDangNhap: ten, hoTen, loai, matKhau, phaiDoiMatKhau: loai !== 'admin' }, cauHinh.bcryptCost);
      ghiNhatKy(db, { hanhDong: 'tao_tai_khoan_thu', doiTuong: 'tai_khoan', doiTuongId: id, chiTiet: { tenDangNhap: ten, loai } });
      console.log('  ' + ten + '  (' + loai + ')  mat khau: ' + matKhau);
    }
  } finally {
    db.close();
  }
}

main().catch((loi) => {
  console.error('[LOI] ' + loi.message);
  process.exit(1);
});
