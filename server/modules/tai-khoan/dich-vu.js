'use strict';
// dich-vu.js: tao tai khoan, doi mat khau (bcryptjs), chinh sach mat khau.
// Mat khau KHONG bao gio duoc luu hay ghi log o dang chu ro; chi luu chuoi bam bcrypt.
const bcrypt = require('bcryptjs');
const { taoQuyenMacDinh } = require('../../loi/quyen');
const { LoiNghiepVu } = require('./tien-ich');

const MAU_TEN_DANG_NHAP = /^[a-z0-9_.-]{3,32}$/i;
const CAC_LOAI = ['admin', 'xem_day_du', 'xem_mot_so_muc'];

// Chinh sach mat khau: tra ve cau thong bao loi, hoac null neu dat.
function kiemTraMatKhau(matKhau, tenDangNhap) {
  if (typeof matKhau !== 'string') {
    return 'Mật khẩu không hợp lệ';
  }
  if (matKhau.length < 10) {
    return 'Mật khẩu phải có ít nhất 10 ký tự';
  }
  if (Buffer.byteLength(matKhau, 'utf8') > 72) {
    return 'Mật khẩu quá dài (tối đa 72 byte, khoảng 72 ký tự không dấu)';
  }
  if (!/\p{L}/u.test(matKhau) || !/\d/.test(matKhau)) {
    return 'Mật khẩu phải có cả chữ và số';
  }
  if (tenDangNhap && matKhau.toLowerCase().includes(String(tenDangNhap).toLowerCase())) {
    return 'Mật khẩu không được chứa tên đăng nhập';
  }
  return null;
}

function bamMatKhau(matKhau, bcryptCost) {
  return bcrypt.hash(matKhau, bcryptCost);
}

function soSanhMatKhau(matKhau, chuoiBam) {
  return bcrypt.compare(matKhau, chuoiBam);
}

// Tao tai khoan moi kem cac dong quyen mac dinh theo loai. Tra ve id.
async function taoTaiKhoan(db, soDangKy, thamSo, bcryptCost) {
  const { tenDangNhap, hoTen, loai, matKhau, phaiDoiMatKhau = true } = thamSo;
  if (!MAU_TEN_DANG_NHAP.test(tenDangNhap || '')) {
    throw new LoiNghiepVu('Tên đăng nhập gồm 3–32 ký tự: chữ không dấu, số, dấu chấm, gạch dưới, gạch ngang');
  }
  if (!CAC_LOAI.includes(loai)) {
    throw new LoiNghiepVu('Loại tài khoản không hợp lệ');
  }
  if (!hoTen || !String(hoTen).trim()) {
    throw new LoiNghiepVu('Cần nhập họ tên');
  }
  const loiMk = kiemTraMatKhau(matKhau, tenDangNhap);
  if (loiMk) {
    throw new LoiNghiepVu(loiMk);
  }
  const chuoiBam = await bamMatKhau(matKhau, bcryptCost);
  try {
    return db.transaction(() => {
      const id = db
        .prepare('INSERT INTO nguoi_dung (ten_dang_nhap, ho_ten, mat_khau_bam, loai, phai_doi_mat_khau) VALUES (?, ?, ?, ?, ?)')
        .run(tenDangNhap, String(hoTen).trim(), chuoiBam, loai, phaiDoiMatKhau ? 1 : 0).lastInsertRowid;
      taoQuyenMacDinh(db, Number(id), loai, soDangKy);
      return Number(id);
    })();
  } catch (loi) {
    if (/UNIQUE/.test(loi.message)) {
      throw new LoiNghiepVu(loai === 'admin' && /loai/.test(loi.message) ? 'Đã có tài khoản admin' : 'Tên đăng nhập đã tồn tại', 409);
    }
    throw loi;
  }
}

// Dat mat khau moi (dung cho doi mat khau va dat lai). Xoa khoa tam, dem sai.
async function datMatKhau(db, nguoiDung, matKhauMoi, bcryptCost, phaiDoiMatKhau) {
  const loiMk = kiemTraMatKhau(matKhauMoi, nguoiDung.ten_dang_nhap);
  if (loiMk) {
    throw new LoiNghiepVu(loiMk);
  }
  const chuoiBam = await bamMatKhau(matKhauMoi, bcryptCost);
  db.prepare(
    "UPDATE nguoi_dung SET mat_khau_bam = ?, phai_doi_mat_khau = ?, so_lan_sai = 0, khoa_den = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
  ).run(chuoiBam, phaiDoiMatKhau ? 1 : 0, nguoiDung.id);
}

module.exports = { CAC_LOAI, kiemTraMatKhau, bamMatKhau, soSanhMatKhau, taoTaiKhoan, datMatKhau };
